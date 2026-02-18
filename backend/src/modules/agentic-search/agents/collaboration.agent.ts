import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '../../../database/neo4j/neo4j.service';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { LLMFactory } from '../llm/llm.factory';
import { safeParseJsonFromLLM, withRetry } from '../utils/llm-helpers';
import { toNumber } from '../interfaces/agent-types';

@Injectable()
export class CollaborationAgent {
  private readonly logger = new Logger(CollaborationAgent.name);

  constructor(
    private readonly neo4j: Neo4jService,
    private readonly prisma: PrismaService,
    private readonly llmFactory: LLMFactory,
  ) {}

  async getCollaborationSuggestions(doctorId: string) {
    const [
      suggestedCoauthors,
      relevantStudyGroups,
      relevantResearchProjects,
      relevantCaseStudies,
      collaborationOpportunities,
    ] = await Promise.all([
      this.getSuggestedCoauthors(doctorId),
      this.getRelevantStudyGroups(doctorId),
      this.getRelevantResearchProjects(doctorId),
      this.getRelevantCaseStudies(doctorId),
      this.getCollaborationOpportunities(doctorId),
    ]);

    // Try LLM-powered insights
    let insights: any = null;
    try {
      insights = await this.generateCollaborationInsights(doctorId, {
        suggestedCoauthors,
        relevantStudyGroups,
        relevantResearchProjects,
        relevantCaseStudies,
        collaborationOpportunities,
      });
    } catch (error) {
      this.logger.warn('LLM collaboration insights failed', error?.message);
    }

    return {
      suggestedCoauthors,
      relevantStudyGroups,
      relevantResearchProjects,
      relevantCaseStudies,
      collaborationOpportunities,
      ...(insights ? { insights } : {}),
    };
  }

  private async getSuggestedCoauthors(doctorId: string) {
    // Find doctors who published on similar topics but haven't collaborated yet
    try {
      const results = await this.neo4j.read(
        `MATCH (me:Doctor {pgId: $doctorId})-[:AUTHORED]->(myPub:Publication)-[:RELATES_TO]->(topic:Specialty)
         MATCH (other:Doctor)-[:AUTHORED]->(theirPub:Publication)-[:RELATES_TO]->(topic)
         WHERE other.pgId <> $doctorId
           AND NOT (me)-[:AUTHORED]->(:Publication)<-[:AUTHORED]-(other)
         WITH other, topic, count(DISTINCT theirPub) AS sharedTopics, count(DISTINCT myPub) AS myPubs
         WHERE sharedTopics >= 1
         OPTIONAL MATCH (other)-[:AUTHORED]->(p:Publication)
         WITH other, sharedTopics, count(DISTINCT p) AS totalPubs
         OPTIONAL MATCH (me)-[:CONNECTED_TO]-(mutual:Doctor)-[:CONNECTED_TO]-(other)
         WITH other, sharedTopics, totalPubs, count(DISTINCT mutual) AS mutualConnections
         ORDER BY sharedTopics DESC, mutualConnections DESC
         LIMIT 10
         RETURN other.pgId AS id, other.fullName AS name, sharedTopics, totalPubs, mutualConnections`,
        { doctorId },
      );
      return results.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        name: r.name as string,
        sharedTopics: toNumber(r.sharedTopics),
        totalPubs: toNumber(r.totalPubs),
        mutualConnections: toNumber(r.mutualConnections),
      }));
    } catch (error) {
      this.logger.error('Failed to get suggested coauthors', error);
      return [];
    }
  }

  private async getRelevantStudyGroups(doctorId: string) {
    try {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId },
        include: { specialties: { include: { specialty: true } } },
      });

      if (!doctor) return [];

      const specialtyIds = doctor.specialties.map((s) => s.specialtyId);

      const groups = await this.prisma.studyGroup.findMany({
        where: {
          OR: [
            { specialtyId: { in: specialtyIds } },
            { isPublic: true },
          ],
          NOT: {
            members: { some: { doctorId } },
          },
        },
        include: {
          specialty: true,
          _count: { select: { members: true } },
        },
        take: 5,
        orderBy: { memberCount: 'desc' },
      });

      return groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        specialty: g.specialty?.name,
        memberCount: g._count.members,
        isPublic: g.isPublic,
      }));
    } catch (error) {
      this.logger.error('Failed to get relevant study groups', error);
      return [];
    }
  }

  private async getRelevantResearchProjects(doctorId: string) {
    try {
      const projects = await this.prisma.researchProject.findMany({
        where: {
          status: { in: ['PLANNING', 'ACTIVE'] },
          NOT: {
            members: { some: { doctorId } },
          },
        },
        include: {
          members: {
            include: { doctor: { select: { fullName: true } } },
            take: 3,
          },
          _count: { select: { members: true } },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      return projects.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        status: p.status,
        teamSize: p._count.members,
        teamMembers: p.members.map((m) => m.doctor.fullName),
      }));
    } catch (error) {
      this.logger.error('Failed to get relevant research projects', error);
      return [];
    }
  }

  private async getRelevantCaseStudies(doctorId: string) {
    try {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId },
        include: { specialties: { include: { specialty: true } } },
      });

      if (!doctor) return [];

      const specialtyIds = doctor.specialties.map((s) => s.specialtyId);

      const cases = await this.prisma.caseStudy.findMany({
        where: {
          status: { in: ['OPEN', 'DISCUSSION'] },
          OR: [
            { specialtyId: { in: specialtyIds } },
          ],
          NOT: {
            OR: [
              { authorId: doctorId },
              { participants: { some: { doctorId } } },
            ],
          },
        },
        include: {
          author: { select: { fullName: true } },
          specialty: true,
          _count: { select: { participants: true, comments: true } },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      return cases.map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        author: c.author.fullName,
        specialty: c.specialty?.name,
        participants: c._count.participants,
        comments: c._count.comments,
        viewCount: c.viewCount,
      }));
    } catch (error) {
      this.logger.error('Failed to get relevant case studies', error);
      return [];
    }
  }

  private async getCollaborationOpportunities(doctorId: string) {
    // Find upcoming events where the doctor could be a speaker or participate
    try {
      const events = await this.prisma.event.findMany({
        where: {
          status: { in: ['UPCOMING', 'ONGOING'] },
          startDate: { gte: new Date() },
          NOT: {
            OR: [
              { attendees: { some: { doctorId } } },
              { speakers: { some: { doctorId } } },
            ],
          },
        },
        include: {
          organizer: { select: { name: true } },
          topics: { include: { topic: true } },
          _count: { select: { attendees: true } },
        },
        take: 5,
        orderBy: { startDate: 'asc' },
      });

      return events.map((e) => ({
        id: e.id,
        title: e.title,
        type: e.eventType,
        startDate: e.startDate,
        location: e.location,
        isOnline: e.isOnline,
        organizer: e.organizer.name,
        topics: e.topics.map((t) => t.topic.name),
        attendeeCount: e._count.attendees,
      }));
    } catch (error) {
      this.logger.error('Failed to get collaboration opportunities', error);
      return [];
    }
  }

  private async generateCollaborationInsights(doctorId: string, data: any) {
    const llm = this.llmFactory.getAdapter();
    if (!llm) return null;

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        specialties: { include: { specialty: true } },
        publications: { include: { publication: { select: { title: true } } }, take: 5 },
      },
    });

    if (!doctor) return null;

    const prompt = `Você é um assistente especializado em colaboração científica médica.

Perfil do médico:
- Nome: ${doctor.fullName}
- Especialidades: ${doctor.specialties.map((s) => s.specialty.name).join(', ')}
- Publicações: ${doctor.publications.length}

Dados de colaboração disponíveis:
${JSON.stringify(data, null, 2)}

Gere insights sobre oportunidades de colaboração para este médico. Responda em JSON:
{
  "summary": "resumo geral das oportunidades",
  "topRecommendations": [
    {
      "type": "coauthor|studyGroup|project|caseStudy|event",
      "reason": "razão da recomendação",
      "action": "ação sugerida"
    }
  ],
  "networkingTips": ["dica 1", "dica 2"]
}`;

    try {
      const response = await withRetry(() =>
        llm.chat(
          [{ role: 'user', content: prompt }],
          undefined,
          { model: 'claude-haiku-4-20250514', maxTokens: 1024 },
        ),
        { maxRetries: 1, delayMs: 500 },
      );

      return safeParseJsonFromLLM(response.content);
    } catch (error) {
      this.logger.error('Failed to generate collaboration insights', error);
      return null;
    }
  }
}
