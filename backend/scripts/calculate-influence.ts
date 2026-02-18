/**
 * Calculate Influence Metrics and Affinity Relationships
 * - PageRank for doctors to identify opinion leaders
 * - Betweenness centrality for connectors
 * - Create affinity relationships based on collaboration patterns
 */
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'medconnect_dev_2026',
  ),
);

async function main() {
  const session = driver.session();
  console.log('=== Calculating Influence Metrics and Affinity ===\n');

  try {
    // 1. Calculate and store PageRank for doctors
    console.log('--- Computing PageRank ---');
    try {
      await session.run(`
        CALL gds.pageRank.write({
          nodeProjection: 'Doctor',
          relationshipProjection: {
            CONNECTED_TO: { orientation: 'UNDIRECTED' }
          },
          writeProperty: 'pageRank'
        })
      `);
      console.log('  PageRank computed and stored on Doctor nodes');
    } catch (e: any) {
      // GDS may not have the graph projected, use fallback
      console.log('  GDS not available, using manual PageRank approximation');
      await computeManualPageRank(session);
    }

    // 2. Calculate betweenness centrality for connectors
    console.log('\n--- Computing Betweenness Centrality ---');
    try {
      await session.run(`
        CALL gds.betweenness.write({
          nodeProjection: 'Doctor',
          relationshipProjection: {
            CONNECTED_TO: { orientation: 'UNDIRECTED' }
          },
          writeProperty: 'betweenness'
        })
      `);
      console.log('  Betweenness centrality computed and stored');
    } catch (e: any) {
      console.log('  GDS not available, using manual approximation');
      await computeManualBetweenness(session);
    }

    // 3. Create SHARES_INTEREST relationships (doctors with same specialty + skills)
    console.log('\n--- Creating SHARES_INTEREST relationships ---');
    const interestResult = await session.run(`
      MATCH (d1:Doctor)-[:SPECIALIZES_IN]->(s:Specialty)<-[:SPECIALIZES_IN]-(d2:Doctor)
      WHERE d1.pgId < d2.pgId
      WITH d1, d2, collect(DISTINCT s.name) AS sharedSpecs
      OPTIONAL MATCH (d1)-[:HAS_SKILL]->(sk:Skill)<-[:HAS_SKILL]-(d2)
      WITH d1, d2, sharedSpecs, collect(DISTINCT sk.name) AS sharedSkills,
           size(sharedSpecs) * 2 + size(collect(DISTINCT sk.name)) AS affinityScore
      WHERE affinityScore > 0
      MERGE (d1)-[r:SHARES_INTEREST {topics: sharedSpecs + sharedSkills}]->(d2)
      SET r.score = affinityScore
      RETURN count(r) AS created
    `);
    console.log(`  Created ${interestResult.records[0]?.get('created') || 0} SHARES_INTEREST relationships`);

    // 4. Create COLLABORATED_WITH relationships (co-authors)
    console.log('\n--- Creating COLLABORATED_WITH relationships ---');
    const collabResult = await session.run(`
      MATCH (d1:Doctor)-[:AUTHORED]->(p:Publication)<-[:AUTHORED]-(d2:Doctor)
      WHERE d1.pgId < d2.pgId
      WITH d1, d2, count(p) AS collaborations, collect(p.title)[0..3] AS papers
      MERGE (d1)-[r:COLLABORATED_WITH]->(d2)
      SET r.collaborations = collaborations, r.papers = papers
      RETURN count(r) AS created
    `);
    console.log(`  Created ${collabResult.records[0]?.get('created') || 0} COLLABORATED_WITH relationships`);

    // 5. Create SIMILAR_CASES relationships (doctors who participated in same case studies)
    console.log('\n--- Creating SIMILAR_CASES relationships ---');
    const casesResult = await session.run(`
      MATCH (d1:Doctor)-[:PARTICIPATED_IN]->(cs:CaseStudy)<-[:PARTICIPATED_IN]-(d2:Doctor)
      WHERE d1.pgId < d2.pgId
      WITH d1, d2, count(cs) AS cases, collect(cs.title)[0..3] AS caseTitles
      MERGE (d1)-[r:SIMILAR_CASES]->(d2)
      SET r.count = cases, r.cases = caseTitles
      RETURN count(r) AS created
    `);
    console.log(`  Created ${casesResult.records[0]?.get('created') || 0} SIMILAR_CASES relationships`);

    // 6. Create Specialty RELATED_TO relationships (based on shared doctors)
    console.log('\n--- Creating Specialty RELATED_TO relationships ---');
    const specRelResult = await session.run(`
      MATCH (s1:Specialty)<-[:SPECIALIZES_IN]-(d:Doctor)-[:SPECIALIZES_IN]->(s2:Specialty)
      WHERE s1.pgId < s2.pgId
      WITH s1, s2, count(d) AS sharedDoctors
      WHERE sharedDoctors > 1
      MERGE (s1)-[r:RELATED_TO]->(s2)
      SET r.sharedDoctors = sharedDoctors, r.similarity = toFloat(sharedDoctors) / 10.0
      RETURN count(r) AS created
    `);
    console.log(`  Created ${specRelResult.records[0]?.get('created') || 0} RELATED_TO relationships between specialties`);

    // 7. Create Institution PARTNERS_WITH relationships (doctors moving between institutions)
    console.log('\n--- Creating Institution PARTNERS_WITH relationships ---');
    const instPartnerResult = await session.run(`
      MATCH (i1:Institution)<-[:WORKS_AT]-(d:Doctor)-[:WORKS_AT]->(i2:Institution)
      WHERE i1.pgId < i2.pgId
      WITH i1, i2, count(d) AS sharedDoctors
      WHERE sharedDoctors > 0
      MERGE (i1)-[r:PARTNERS_WITH]->(i2)
      SET r.sharedDoctors = sharedDoctors
      RETURN count(r) AS created
    `);
    console.log(`  Created ${instPartnerResult.records[0]?.get('created') || 0} PARTNERS_WITH relationships`);

    // 8. Show top doctors by PageRank
    console.log('\n--- Top 10 Doctors by PageRank (Influence) ---');
    const topDoctors = await session.run(`
      MATCH (d:Doctor)
      WHERE d.pageRank IS NOT NULL
      RETURN d.fullName AS name, d.pageRank AS pageRank, d.city AS city
      ORDER BY d.pageRank DESC
      LIMIT 10
    `);
    for (const r of topDoctors.records) {
      console.log(`  ${(r.get('pageRank') as number).toFixed(4)} - ${r.get('name')} (${r.get('city') || 'N/A'})`);
    }

    // 9. Final stats
    console.log('\n--- Final Relationship Stats ---');
    const finalStats = await session.run(`
      MATCH ()-[r]->()
      RETURN type(r) AS relType, count(r) AS cnt
      ORDER BY cnt DESC
    `);
    for (const r of finalStats.records) {
      console.log(`  ${r.get('relType')}: ${r.get('cnt')}`);
    }

  } finally {
    await session.close();
  }

  await driver.close();
  console.log('\n=== Influence and Affinity calculation complete! ===');
}

// Manual PageRank approximation when GDS is not available
async function computeManualPageRank(session: any) {
  // Simple iterative PageRank with 10 iterations
  const dampingFactor = 0.85;
  const iterations = 10;

  // Initialize all doctors with rank 1
  await session.run(`
    MATCH (d:Doctor)
    SET d.tempPageRank = 1.0
  `);

  for (let i = 0; i < iterations; i++) {
    // Calculate new ranks
    await session.run(`
      MATCH (d:Doctor)
      OPTIONAL MATCH (d)<-[:CONNECTED_TO]-(neighbor:Doctor)
      WITH d, neighbor, neighbor.tempPageRank AS neighborRank,
           count {(neighbor)-[:CONNECTED_TO]->()} AS neighborOutDegree
      WITH d, coalesce(sum(neighborRank / CASE WHEN neighborOutDegree > 0 THEN neighborOutDegree ELSE 1 END), 0) AS contribution
      SET d.newPageRank = ${(1 - dampingFactor)} + ${dampingFactor} * contribution
    `);

    // Update ranks
    await session.run(`
      MATCH (d:Doctor)
      SET d.tempPageRank = d.newPageRank
    `);
  }

  // Store final PageRank
  await session.run(`
    MATCH (d:Doctor)
    SET d.pageRank = d.tempPageRank
    REMOVE d.tempPageRank, d.newPageRank
  `);
}

// Manual betweenness approximation
async function computeManualBetweenness(session: any) {
  // For simplicity, use degree centrality as a proxy
  await session.run(`
    MATCH (d:Doctor)-[c:CONNECTED_TO]-()
    WITH d, count(c) AS degree
    SET d.betweenness = toFloat(degree) * 10
  `);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
