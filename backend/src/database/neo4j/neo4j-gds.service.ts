import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Neo4jService } from './neo4j.service';

/**
 * Graph Data Science (GDS) service.
 * Runs graph algorithms to compute centrality scores, communities, and similarity.
 * Results are written back to node properties for fast querying.
 *
 * Requires the neo4j-graph-data-science plugin.
 * Degrades gracefully if GDS is not installed.
 */
@Injectable()
export class Neo4jGdsService {
  private readonly logger = new Logger(Neo4jGdsService.name);
  private gdsAvailable = false;
  private readonly GRAPH_NAME = 'medconnect';

  constructor(private readonly neo4j: Neo4jService) {}

  async onModuleInit() {
    await this.checkGdsAvailability();
    if (this.gdsAvailable) {
      await this.runAllAlgorithms();
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Scheduled: recompute every 6 hours
  // ────────────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_6_HOURS)
  async scheduledRun() {
    if (!this.gdsAvailable) return;
    this.logger.log('GDS scheduled run starting...');
    await this.runAllAlgorithms();
  }

  async runAllAlgorithms() {
    if (!this.gdsAvailable) {
      this.logger.warn('GDS not available, skipping algorithms');
      return;
    }

    try {
      await this.dropProjectionIfExists();
      await this.createGraphProjection();
      await this.runPageRank();
      await this.runBetweennessCentrality();
      await this.runCommunityDetection();
      await this.runNodeSimilarity();
      await this.dropProjectionIfExists();
      this.logger.log('GDS: All algorithms completed successfully');
    } catch (error) {
      this.logger.error('GDS: Algorithm run failed', error instanceof Error ? error.message : error);
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Graph Projection
  // ────────────────────────────────────────────────────────────────

  private async createGraphProjection() {
    await this.neo4j.write(
      `CALL gds.graph.project(
        $graphName,
        ['Doctor', 'Institution', 'Specialty', 'Publication', 'StudyGroup', 'ResearchProject'],
        {
          CONNECTED_TO:    { orientation: 'UNDIRECTED' },
          SPECIALIZES_IN:  { orientation: 'NATURAL' },
          WORKS_AT:        { orientation: 'NATURAL' },
          AUTHORED:        { orientation: 'NATURAL' },
          MEMBER_OF:       { orientation: 'NATURAL' },
          COLLABORATES_ON: { orientation: 'NATURAL' },
          MENTORS:         { orientation: 'NATURAL' },
          ENDORSED:        { orientation: 'NATURAL' }
        }
      )`,
      { graphName: this.GRAPH_NAME },
    );
    this.logger.log('GDS: Graph projection created');
  }

  private async dropProjectionIfExists() {
    try {
      const exists = await this.neo4j.read<{ exists: boolean }>(
        `CALL gds.graph.exists($graphName) YIELD exists RETURN exists`,
        { graphName: this.GRAPH_NAME },
      );
      if (exists[0]?.exists) {
        await this.neo4j.write(
          `CALL gds.graph.drop($graphName)`,
          { graphName: this.GRAPH_NAME },
        );
      }
    } catch {
      // Graph doesn't exist, nothing to drop
    }
  }

  // ────────────────────────────────────────────────────────────────
  // PageRank — identifies influential doctors
  // ────────────────────────────────────────────────────────────────

  private async runPageRank() {
    await this.neo4j.write(
      `CALL gds.pageRank.write($graphName, {
        writeProperty: 'pageRank',
        maxIterations: 20,
        dampingFactor: 0.85,
        nodeLabels: ['Doctor']
      })
      YIELD nodePropertiesWritten, ranIterations`,
      { graphName: this.GRAPH_NAME },
    );
    this.logger.log('GDS: PageRank computed');
  }

  // ────────────────────────────────────────────────────────────────
  // Betweenness Centrality — identifies bridge/broker doctors
  // ────────────────────────────────────────────────────────────────

  private async runBetweennessCentrality() {
    await this.neo4j.write(
      `CALL gds.betweenness.write($graphName, {
        writeProperty: 'betweenness',
        nodeLabels: ['Doctor']
      })
      YIELD nodePropertiesWritten`,
      { graphName: this.GRAPH_NAME },
    );
    this.logger.log('GDS: Betweenness Centrality computed');
  }

  // ────────────────────────────────────────────────────────────────
  // Louvain Community Detection — finds clusters of doctors
  // ────────────────────────────────────────────────────────────────

  private async runCommunityDetection() {
    await this.neo4j.write(
      `CALL gds.louvain.write($graphName, {
        writeProperty: 'communityId',
        nodeLabels: ['Doctor']
      })
      YIELD communityCount, modularity`,
      { graphName: this.GRAPH_NAME },
    );
    this.logger.log('GDS: Community Detection (Louvain) computed');
  }

  // ────────────────────────────────────────────────────────────────
  // Node Similarity — finds similar doctors based on shared relationships
  // Written as SIMILAR_TO relationships between Doctor nodes
  // ────────────────────────────────────────────────────────────────

  private async runNodeSimilarity() {
    try {
      // Drop existing similarity relationships first
      await this.neo4j.write(
        `MATCH ()-[r:SIMILAR_TO]->() DELETE r`,
      );

      await this.neo4j.write(
        `CALL gds.nodeSimilarity.write($graphName, {
          writeRelationshipType: 'SIMILAR_TO',
          writeProperty: 'score',
          nodeLabels: ['Doctor'],
          topK: 10,
          similarityCutoff: 0.3
        })
        YIELD nodesCompared, relationshipsWritten`,
        { graphName: this.GRAPH_NAME },
      );
      this.logger.log('GDS: Node Similarity computed');
    } catch (error) {
      this.logger.warn('GDS: Node Similarity skipped (may require more data)', error instanceof Error ? error.message : '');
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Public query methods — used by services and agentic search
  // ────────────────────────────────────────────────────────────────

  /**
   * Get the top N most influential doctors by PageRank score.
   */
  async getTopInfluentialDoctors(limit = 20) {
    return this.neo4j.read(
      `MATCH (d:Doctor)
       WHERE d.pageRank IS NOT NULL
       OPTIONAL MATCH (d)-[:SPECIALIZES_IN]->(s:Specialty)
       WITH d, collect(s.name) AS specialties
       ORDER BY d.pageRank DESC
       LIMIT toInteger($limit)
       RETURN d.pgId AS id, d.fullName AS name, d.pageRank AS pageRank,
              d.betweenness AS betweenness, d.communityId AS communityId, specialties`,
      { limit },
    );
  }

  /**
   * Get the top bridge/broker doctors (betweenness centrality).
   */
  async getTopBridgeDoctors(limit = 20) {
    return this.neo4j.read(
      `MATCH (d:Doctor)
       WHERE d.betweenness IS NOT NULL AND d.betweenness > 0
       ORDER BY d.betweenness DESC
       LIMIT toInteger($limit)
       RETURN d.pgId AS id, d.fullName AS name, d.betweenness AS betweenness,
              d.pageRank AS pageRank, d.communityId AS communityId`,
      { limit },
    );
  }

  /**
   * Get all communities with their member count and top members.
   */
  async getCommunities() {
    return this.neo4j.read(
      `MATCH (d:Doctor)
       WHERE d.communityId IS NOT NULL
       WITH d.communityId AS communityId, count(d) AS memberCount,
            collect({id: d.pgId, name: d.fullName, pageRank: d.pageRank})[0..5] AS topMembers
       WHERE memberCount >= 3
       ORDER BY memberCount DESC
       RETURN communityId, memberCount, topMembers`,
    );
  }

  /**
   * Find doctors similar to a given doctor (via SIMILAR_TO relationships).
   */
  async getSimilarDoctors(doctorId: string, limit = 10) {
    return this.neo4j.read(
      `MATCH (d:Doctor {pgId: $doctorId})-[s:SIMILAR_TO]->(similar:Doctor)
       OPTIONAL MATCH (similar)-[:SPECIALIZES_IN]->(spec:Specialty)
       WITH similar, s.score AS similarity, collect(spec.name) AS specialties
       ORDER BY similarity DESC
       LIMIT toInteger($limit)
       RETURN similar.pgId AS id, similar.fullName AS name, similarity, specialties`,
      { doctorId, limit },
    );
  }

  /**
   * Get a doctor's community peers.
   */
  async getCommunityPeers(doctorId: string, limit = 20) {
    return this.neo4j.read(
      `MATCH (me:Doctor {pgId: $doctorId})
       WHERE me.communityId IS NOT NULL
       MATCH (peer:Doctor {communityId: me.communityId})
       WHERE peer.pgId <> $doctorId
       OPTIONAL MATCH (peer)-[:SPECIALIZES_IN]->(s:Specialty)
       WITH peer, collect(s.name) AS specialties
       ORDER BY peer.pageRank DESC
       LIMIT toInteger($limit)
       RETURN peer.pgId AS id, peer.fullName AS name, peer.pageRank AS pageRank, specialties`,
      { doctorId, limit },
    );
  }

  // ────────────────────────────────────────────────────────────────
  // Full-text search queries — powered by the indexes in setup
  // ────────────────────────────────────────────────────────────────

  /**
   * Fuzzy search for doctors by name using full-text index.
   */
  async searchDoctorsByName(query: string, limit = 10) {
    const luceneQuery = query.split(/\s+/).map(w => `${w}~`).join(' AND ');
    return this.neo4j.read(
      `CALL db.index.fulltext.queryNodes('doctor_fulltext', $query)
       YIELD node, score
       OPTIONAL MATCH (node)-[:SPECIALIZES_IN]->(s:Specialty)
       WITH node, score, collect(s.name) AS specialties
       LIMIT toInteger($limit)
       RETURN node.pgId AS id, node.fullName AS name, node.city AS city,
              score, specialties`,
      { query: luceneQuery, limit },
    );
  }

  /**
   * Fuzzy search for institutions by name.
   */
  async searchInstitutionsByName(query: string, limit = 10) {
    const luceneQuery = query.split(/\s+/).map(w => `${w}~`).join(' AND ');
    return this.neo4j.read(
      `CALL db.index.fulltext.queryNodes('institution_fulltext', $query)
       YIELD node, score
       LIMIT toInteger($limit)
       RETURN node.pgId AS id, node.name AS name, node.city AS city,
              node.type AS type, score`,
      { query: luceneQuery, limit },
    );
  }

  /**
   * Fuzzy search across publications by title.
   */
  async searchPublications(query: string, limit = 10) {
    const luceneQuery = query.split(/\s+/).map(w => `${w}~`).join(' AND ');
    return this.neo4j.read(
      `CALL db.index.fulltext.queryNodes('publication_fulltext', $query)
       YIELD node, score
       OPTIONAL MATCH (node)<-[:AUTHORED]-(a:Doctor)
       WITH node, score, collect(a.fullName)[0..3] AS authors
       LIMIT toInteger($limit)
       RETURN node.pgId AS id, node.title AS title, node.journal AS journal,
              score, authors`,
      { query: luceneQuery, limit },
    );
  }

  private async checkGdsAvailability() {
    try {
      await this.neo4j.read(`RETURN gds.version() AS version`);
      this.gdsAvailable = true;
      this.logger.log('GDS plugin detected');
    } catch {
      this.gdsAvailable = false;
      this.logger.warn('GDS plugin not available — graph algorithms disabled');
    }
  }
}
