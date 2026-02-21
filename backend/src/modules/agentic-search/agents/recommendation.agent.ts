import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '../../../database/neo4j/neo4j.service';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { LLMFactory } from '../llm/llm.factory';
import { RECOMMENDATION_AGENT_SYSTEM_PROMPT } from '../prompts/system-prompts';
import { safeParseJsonFromLLM, withRetry } from '../utils/llm-helpers';
import { toNumber } from '../interfaces/agent-types';

@Injectable()
export class RecommendationAgent {
  private readonly logger = new Logger(RecommendationAgent.name);

  constructor(
    private readonly neo4j: Neo4jService,
    private readonly prisma: PrismaService,
    private readonly llmFactory: LLMFactory,
  ) {}

  async getRecommendations(doctorId: string) {
    // Gather graph data in parallel
    const [
      suggestedConnections,
      suggestedJobs,
      suggestedInstitutions,
      highlightedDoctors,
      networkStats,
    ] = await Promise.all([
      this.getSuggestedConnections(doctorId),
      this.getSuggestedJobs(doctorId),
      this.getSuggestedInstitutions(doctorId),
      this.getHighlightedDoctors(doctorId),
      this.getNetworkStats(doctorId),
    ]);

    // Try LLM-powered insights
    let insights: any = null;
    try {
      insights = await this.generateInsights(doctorId, {
        suggestedConnections,
        suggestedJobs,
        suggestedInstitutions,
        highlightedDoctors,
        networkStats,
      });
    } catch (error) {
      this.logger.warn('LLM insights generation failed, using graph data only', error?.message);
    }

    return {
      suggestedConnections,
      suggestedJobs,
      suggestedInstitutions,
      highlightedDoctors,
      networkStats,
      ...(insights ? { insights } : {}),
    };
  }

  private async generateInsights(doctorId: string, graphData: any) {
    const llm = this.llmFactory.getAdapter();
    if (!llm) return null;

    // Get doctor profile
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        specialties: { include: { specialty: true } },
        skills: { include: { skill: true } },
      },
    });

    if (!doctor) return null;

    const profileSummary = {
      name: doctor.fullName,
      city: doctor.city,
      state: doctor.state,
      specialties: doctor.specialties.map((s) => s.specialty.name),
      skills: doctor.skills.map((s) => s.skill.name),
    };

    const prompt = `Perfil do médico:
${JSON.stringify(profileSummary, null, 2)}

Estatísticas do network:
${JSON.stringify(graphData.networkStats, null, 2)}

Sugestões de conexão (baseadas no grafo):
${JSON.stringify(graphData.suggestedConnections?.slice(0, 5), null, 2)}

Vagas compatíveis:
${JSON.stringify(graphData.suggestedJobs?.slice(0, 5), null, 2)}

Médicos em destaque (mesma especialidade):
${JSON.stringify(graphData.highlightedDoctors?.slice(0, 5), null, 2)}

Instituições próximas:
${JSON.stringify(graphData.suggestedInstitutions?.slice(0, 5), null, 2)}

Analise esses dados e gere recomendações personalizadas no formato JSON especificado.`;

    // Use Haiku for recommendations — much cheaper than Sonnet
    // and sufficient for structured JSON generation from pre-fetched data
    const response = await withRetry(() =>
      llm.chat(
        [
          { role: 'system', content: RECOMMENDATION_AGENT_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        undefined,
        { model: 'claude-haiku-4-20250514', maxTokens: 1024 },
      ),
      { maxRetries: 1, delayMs: 500 },
    );

    if (!response.content) return null;

    const parsed = safeParseJsonFromLLM(response.content);
    if (parsed) return parsed;

    // Return as plain text insight if JSON parsing failed
    return { summary: response.content, suggestedConnections: [], suggestedJobs: [], insights: [] };
  }

  private async getNetworkStats(doctorId: string) {
    try {
      const results = await this.neo4j.read(
        `MATCH (d:Doctor {pgId: $doctorId})
         OPTIONAL MATCH (d)-[conn:CONNECTED_TO]-()
         WITH d, count(DISTINCT conn) AS connections
         OPTIONAL MATCH (d)<-[fol:FOLLOWS]-()
         WITH d, connections, count(DISTINCT fol) AS followers
         OPTIONAL MATCH (d)-[:HAS_SKILL]->(sk:Skill)
         WITH d, connections, followers, count(DISTINCT sk) AS skillCount
         OPTIONAL MATCH (d)<-[end:ENDORSED]-()
         RETURN connections, followers, skillCount, count(DISTINCT end) AS endorsements`,
        { doctorId },
      );
      if (results.length === 0) return {};
      const r = results[0] as Record<string, unknown>;
      return {
        connections: toNumber(r.connections),
        followers: toNumber(r.followers),
        skillCount: toNumber(r.skillCount),
        endorsements: toNumber(r.endorsements),
      };
    } catch (error) {
      this.logger.error('Failed to get network stats', error);
      return {};
    }
  }

  private async getSuggestedConnections(doctorId: string) {
    try {
      // Strategy 1: friends of friends
      const fof = await this.neo4j.read(
        `MATCH (me:Doctor {pgId: $doctorId})-[:CONNECTED_TO]->(friend:Doctor)-[:CONNECTED_TO]->(suggestion:Doctor)
         WHERE suggestion.pgId <> $doctorId
           AND NOT (me)-[:CONNECTED_TO]->(suggestion)
         WITH suggestion, count(DISTINCT friend) AS mutual
         ORDER BY mutual DESC
         LIMIT 5
         RETURN suggestion.pgId AS id, suggestion.fullName AS name,
                suggestion.city AS city, suggestion.state AS state,
                suggestion.profilePicUrl AS picUrl, mutual AS mutualConnections,
                'mutual' AS reason`,
        { doctorId },
      );

      // Strategy 2: same specialty not yet connected
      const sameSpec = await this.neo4j.read(
        `MATCH (me:Doctor {pgId: $doctorId})-[:SPECIALIZES_IN]->(spec:Specialty)<-[:SPECIALIZES_IN]-(suggestion:Doctor)
         WHERE suggestion.pgId <> $doctorId
           AND NOT (me)-[:CONNECTED_TO]->(suggestion)
         WITH suggestion, collect(DISTINCT spec.name) AS sharedSpecialties
         LIMIT 5
         RETURN suggestion.pgId AS id, suggestion.fullName AS name,
                suggestion.city AS city, suggestion.state AS state,
                suggestion.profilePicUrl AS picUrl, 0 AS mutualConnections,
                sharedSpecialties[0] AS reason`,
        { doctorId },
      );

      // Strategy 3: same city, different specialty (geographic proximity)
      const sameCity = await this.neo4j.read(
        `MATCH (me:Doctor {pgId: $doctorId}), (suggestion:Doctor)
         WHERE suggestion.pgId <> $doctorId
           AND suggestion.city = me.city
           AND NOT (me)-[:CONNECTED_TO]->(suggestion)
         OPTIONAL MATCH (suggestion)-[:SPECIALIZES_IN]->(spec:Specialty)
         WITH suggestion, collect(DISTINCT spec.name) AS specs
         LIMIT 5
         RETURN suggestion.pgId AS id, suggestion.fullName AS name,
                suggestion.city AS city, suggestion.state AS state,
                suggestion.profilePicUrl AS picUrl, 0 AS mutualConnections,
                'mesma cidade' AS reason`,
        { doctorId },
      );

      // Deduplicate by id, prioritizing fof > sameSpec > sameCity
      const seen = new Set<string>();
      const all = [...fof, ...sameSpec, ...sameCity];
      return all
        .filter((r: Record<string, unknown>) => {
          const id = r.id as string;
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        })
        .slice(0, 10)
        .map((r: Record<string, unknown>) => ({
          id: r.id as string,
          name: r.name as string,
          city: r.city as string | null,
          state: r.state as string | null,
          picUrl: r.picUrl as string | null,
          mutualConnections: toNumber(r.mutualConnections),
          reason: r.reason as string | null,
        }));
    } catch (error) {
      this.logger.error('Failed to get connection suggestions', error);
      return [];
    }
  }

  private async getSuggestedJobs(doctorId: string) {
    // Always use PostgreSQL — reliable source for jobs with specialty + location match
    try {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId },
        include: { specialties: { include: { specialty: true } } },
      });

      if (!doctor) return [];

      const specialtyIds = doctor.specialties.map((s) => s.specialtyId);
      const specialtyNames = doctor.specialties.map((s) => s.specialty.name);

      const jobs = await this.prisma.job.findMany({
        where: {
          isActive: true,
          OR: [
            ...(specialtyIds.length > 0 ? [{ specialtyId: { in: specialtyIds } }] : []),
            ...(doctor.city ? [{ city: doctor.city }] : []),
            ...(doctor.state ? [{ state: doctor.state }] : []),
          ],
        },
        include: { institution: { select: { name: true } } },
        take: 8,
        orderBy: { createdAt: 'desc' },
      });

      return jobs.map((j) => ({
        id: j.id,
        title: j.title,
        type: j.type,
        city: j.city,
        state: j.state,
        shift: j.shift,
        institution: j.institution?.name ?? null,
        specialtyMatch: specialtyNames.some((s) =>
          j.title.toLowerCase().includes(s.toLowerCase()),
        ),
      }));
    } catch (error) {
      this.logger.error('Failed to get job suggestions', error);
      return [];
    }
  }

  private async getSuggestedInstitutions(doctorId: string) {
    try {
      // Use doctor.city property directly — no LOCATED_IN needed
      const neo4jResults = await this.neo4j.read(
        `MATCH (me:Doctor {pgId: $doctorId})
         MATCH (i:Institution)
         WHERE i.city = me.city
           AND NOT (me)-[:WORKS_AT]->(i)
         RETURN i.pgId AS id, i.name AS name, i.type AS type, i.city AS city
         LIMIT 5`,
        { doctorId },
      );

      if (neo4jResults.length > 0) return neo4jResults;
    } catch (error) {
      this.logger.warn('Neo4j institution suggestions failed, using PostgreSQL', error?.message);
    }

    // Fallback: PostgreSQL
    try {
      const doctor = await this.prisma.doctor.findUnique({ where: { id: doctorId } });
      if (!doctor) return [];

      const institutions = await this.prisma.institution.findMany({
        where: {
          OR: [
            ...(doctor.city ? [{ city: doctor.city }] : []),
            ...(doctor.state ? [{ state: doctor.state }] : []),
          ],
        },
        take: 5,
      });

      return institutions.map((i) => ({
        id: i.id,
        name: i.name,
        type: i.type,
        city: i.city,
        state: i.state,
      }));
    } catch (error) {
      this.logger.error('Failed to get institution suggestions', error);
      return [];
    }
  }

  private async getHighlightedDoctors(doctorId: string) {
    try {
      const results = await this.neo4j.read(
        `MATCH (me:Doctor {pgId: $doctorId})-[:SPECIALIZES_IN]->(spec:Specialty)<-[:SPECIALIZES_IN]-(other:Doctor)
         WHERE other.pgId <> $doctorId
         WITH other, count(DISTINCT spec) AS sharedSpecs
         MATCH (other)-[c:CONNECTED_TO]-()
         WITH other, sharedSpecs, count(c) AS connections
         ORDER BY sharedSpecs DESC, connections DESC
         LIMIT 5
         RETURN other.pgId AS id, other.fullName AS name,
                other.profilePicUrl AS picUrl, sharedSpecs, connections`,
        { doctorId },
      );
      return results.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        name: r.name as string,
        picUrl: r.picUrl as string | null,
        sharedSpecs: toNumber(r.sharedSpecs),
        connections: toNumber(r.connections),
      }));
    } catch (error) {
      this.logger.error('Failed to get highlighted doctors', error);
      return [];
    }
  }
}
