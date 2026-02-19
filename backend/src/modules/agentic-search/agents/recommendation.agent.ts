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
      const results = await this.neo4j.read(
        `MATCH (me:Doctor {pgId: $doctorId})-[:CONNECTED_TO]->(friend:Doctor)-[:CONNECTED_TO]->(suggestion:Doctor)
         WHERE suggestion.pgId <> $doctorId
           AND NOT (me)-[:CONNECTED_TO]->(suggestion)
         WITH suggestion, count(DISTINCT friend) AS mutual
         ORDER BY mutual DESC
         LIMIT 5
         RETURN suggestion.pgId AS id, suggestion.fullName AS name,
                suggestion.profilePicUrl AS picUrl, mutual AS mutualConnections`,
        { doctorId },
      );
      return results.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        name: r.name as string,
        picUrl: r.picUrl as string | null,
        mutualConnections: toNumber(r.mutualConnections),
      }));
    } catch (error) {
      this.logger.error('Failed to get connection suggestions', error);
      return [];
    }
  }

  private async getSuggestedJobs(doctorId: string) {
    try {
      // Find jobs matching doctor's specialties or location
      const results = await this.neo4j.read(
        `MATCH (me:Doctor {pgId: $doctorId})-[:SPECIALIZES_IN]->(spec:Specialty)
         OPTIONAL MATCH (me)-[:LOCATED_IN]->(myCity:City)
         WITH me, collect(DISTINCT spec.name) AS mySpecs, myCity
         MATCH (j:Job {isActive: true})<-[:POSTED]-(i:Institution)
         OPTIONAL MATCH (j)-[:REQUIRES]->(jSpec:Specialty)
         WHERE (myCity IS NOT NULL AND j.city = myCity.name)
            OR (jSpec IS NOT NULL AND jSpec.name IN mySpecs)
         RETURN DISTINCT j.pgId AS id, j.title AS title, j.type AS type,
                j.city AS city, j.shift AS shift, i.name AS institution
         LIMIT 5`,
        { doctorId },
      );

      return results;
    } catch (error) {
      this.logger.error('Failed to get job suggestions', error);
      // Fallback to PostgreSQL
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId },
        include: { specialties: true },
      });

      if (!doctor) return [];

      return this.prisma.job.findMany({
        where: {
          isActive: true,
          OR: [
            {
              specialtyId: {
                in: doctor.specialties.map((s) => s.specialtyId),
              },
            },
            { city: doctor.city || '' },
          ],
        },
        include: { institution: { select: { name: true } } },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
    }
  }

  private async getSuggestedInstitutions(doctorId: string) {
    try {
      return await this.neo4j.read(
        `MATCH (me:Doctor {pgId: $doctorId})-[:LOCATED_IN]->(city:City)
         MATCH (i:Institution {city: city.name})
         WHERE NOT (me)-[:WORKS_AT]->(i)
         RETURN i.pgId AS id, i.name AS name, i.type AS type, i.city AS city
         LIMIT 5`,
        { doctorId },
      );
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
