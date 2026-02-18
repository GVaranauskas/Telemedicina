import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '../../../database/neo4j/neo4j.service';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { LLMFactory } from '../llm/llm.factory';
import { safeParseJsonFromLLM, withRetry } from '../utils/llm-helpers';
import { toNumber } from '../interfaces/agent-types';

@Injectable()
export class CareerAgent {
  private readonly logger = new Logger(CareerAgent.name);

  constructor(
    private readonly neo4j: Neo4jService,
    private readonly prisma: PrismaService,
    private readonly llmFactory: LLMFactory,
  ) {}

  async getCareerSuggestions(doctorId: string) {
    const [
      careerProgress,
      suggestedCertifications,
      suggestedMentors,
      menteeOpportunities,
      relevantCourses,
    ] = await Promise.all([
      this.getCareerProgress(doctorId),
      this.getSuggestedCertifications(doctorId),
      this.getSuggestedMentors(doctorId),
      this.getMenteeOpportunities(doctorId),
      this.getRelevantCourses(doctorId),
    ]);

    // Try LLM-powered insights
    let insights: any = null;
    try {
      insights = await this.generateCareerInsights(doctorId, {
        careerProgress,
        suggestedCertifications,
        suggestedMentors,
        menteeOpportunities,
        relevantCourses,
      });
    } catch (error) {
      this.logger.warn('LLM career insights failed', error?.message);
    }

    return {
      careerProgress,
      suggestedCertifications,
      suggestedMentors,
      menteeOpportunities,
      relevantCourses,
      ...(insights ? { insights } : {}),
    };
  }

  private async getCareerProgress(doctorId: string) {
    try {
      const progress = await this.prisma.doctorCareerProgress.findMany({
        where: { doctorId },
        include: {
          careerPath: { include: { specialty: true } },
          milestone: true,
        },
        orderBy: { milestone: { orderNum: 'asc' } },
      });

      // Group by career path
      const byPath: Record<string, any> = {};
      for (const p of progress) {
        const pathId = p.careerPathId;
        if (!byPath[pathId]) {
          byPath[pathId] = {
            careerPath: p.careerPath.name,
            specialty: p.careerPath.specialty?.name,
            totalMilestones: 0,
            completed: 0,
            inProgress: 0,
            nextMilestone: null,
            milestones: [],
          };
        }
        byPath[pathId].totalMilestones++;
        if (p.status === 'COMPLETED') byPath[pathId].completed++;
        if (p.status === 'IN_PROGRESS') byPath[pathId].inProgress++;
        if (!byPath[pathId].nextMilestone && p.status !== 'COMPLETED') {
          byPath[pathId].nextMilestone = {
            name: p.milestone.name,
            order: p.milestone.orderNum,
          };
        }
        byPath[pathId].milestones.push({
          name: p.milestone.name,
          order: p.milestone.orderNum,
          status: p.status,
          isRequired: p.milestone.isRequired,
        });
      }

      return Object.values(byPath).map((p: any) => ({
        ...p,
        percentage: p.totalMilestones > 0
          ? Math.round((p.completed / p.totalMilestones) * 100)
          : 0,
      }));
    } catch (error) {
      this.logger.error('Failed to get career progress', error);
      return [];
    }
  }

  private async getSuggestedCertifications(doctorId: string) {
    try {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId },
        include: {
          specialties: { include: { specialty: true } },
          certifications: { include: { certification: true } },
        },
      });

      if (!doctor) return [];

      const specialtyIds = doctor.specialties.map((s) => s.specialtyId);
      const existingCertIds = doctor.certifications.map((c) => c.certificationId);

      const certs = await this.prisma.certification.findMany({
        where: {
          OR: [
            { specialtyId: { in: specialtyIds } },
            { certificationType: 'CONTINUING_EDUCATION' },
          ],
          NOT: { id: { in: existingCertIds } },
        },
        include: { specialty: true },
        take: 10,
        orderBy: [{ certificationType: 'asc' }, { name: 'asc' }],
      });

      return certs.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.certificationType,
        issuingBody: c.issuingBody,
        validityYears: c.validityYears,
        specialty: c.specialty?.name,
      }));
    } catch (error) {
      this.logger.error('Failed to get suggested certifications', error);
      return [];
    }
  }

  private async getSuggestedMentors(doctorId: string) {
    try {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId },
        include: { specialties: { include: { specialty: true } } },
      });

      if (!doctor) return [];

      const currentYear = new Date().getFullYear();
      // Find mentors with at least 10 years experience (graduated 10+ years ago)
      const minYear = currentYear - 10;

      const results = await this.neo4j.read(
        `MATCH (mentee:Doctor {pgId: $doctorId})-[:SPECIALIZES_IN]->(spec:Specialty)
         MATCH (mentor:Doctor)-[:SPECIALIZES_IN]->(spec)
         WHERE mentor.pgId <> $doctorId
           AND mentor.graduationYear <= $minYear
           AND NOT (mentee)-[:MENTORS]->(mentor)
           AND NOT (mentor)-[:MENTORS]->(mentee)
         OPTIONAL MATCH (mentee)-[:CONNECTED_TO]-(mutual:Doctor)-[:CONNECTED_TO]-(mentor)
         OPTIONAL MATCH (mentor)<-[m:MENTORS]-(:Doctor)
         WITH mentor, count(DISTINCT mutual) AS mutualConnections, count(m) AS menteeCount
         ORDER BY mutualConnections DESC, menteeCount DESC
         LIMIT 10
         RETURN mentor.pgId AS id, mentor.fullName AS name, mentor.city AS city,
                mentor.graduationYear AS gradYear, mutualConnections, menteeCount`,
        { doctorId, minYear },
      );

      return results.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        name: r.name as string,
        city: r.city as string | null,
        yearsExperience: currentYear - (toNumber(r.gradYear) || (currentYear - 10)),
        mutualConnections: toNumber(r.mutualConnections),
        currentMentees: toNumber(r.menteeCount),
      }));
    } catch (error) {
      this.logger.error('Failed to get suggested mentors', error);
      return [];
    }
  }

  private async getMenteeOpportunities(doctorId: string) {
    try {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId },
        include: { specialties: { include: { specialty: true } } },
      });

      if (!doctor || !doctor.graduationYear) return [];

      const currentYear = new Date().getFullYear();
      const yearsExperience = currentYear - doctor.graduationYear;

      // Only suggest mentees if doctor has 8+ years experience
      if (yearsExperience < 8) return [];

      const maxYear = currentYear - 5;

      const results = await this.neo4j.read(
        `MATCH (mentor:Doctor {pgId: $doctorId})-[:SPECIALIZES_IN]->(spec:Specialty)
         MATCH (mentee:Doctor)-[:SPECIALIZES_IN]->(spec)
         WHERE mentee.pgId <> $doctorId
           AND mentee.graduationYear >= $maxYear
           AND NOT (mentee)-[:MENTORS]->(mentor)
           AND NOT (mentor)-[:MENTORS]->(mentee)
         OPTIONAL MATCH (mentor)-[:CONNECTED_TO]-(mutual:Doctor)-[:CONNECTED_TO]-(mentee)
         WITH mentee, count(DISTINCT mutual) AS mutualConnections
         ORDER BY mutualConnections DESC, mentee.graduationYear DESC
         LIMIT 10
         RETURN mentee.pgId AS id, mentee.fullName AS name, mentee.city AS city,
                mentee.graduationYear AS gradYear, mutualConnections`,
        { doctorId, maxYear },
      );

      return results.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        name: r.name as string,
        city: r.city as string | null,
        yearsExperience: currentYear - (toNumber(r.gradYear) || currentYear),
        mutualConnections: toNumber(r.mutualConnections),
      }));
    } catch (error) {
      this.logger.error('Failed to get mentee opportunities', error);
      return [];
    }
  }

  private async getRelevantCourses(doctorId: string) {
    try {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId },
        include: {
          specialties: { include: { specialty: true } },
          courseEnrollments: true,
        },
      });

      if (!doctor) return [];

      const specialtyIds = doctor.specialties.map((s) => s.specialtyId);
      const enrolledCourseIds = doctor.courseEnrollments.map((e) => e.courseId);

      const primarySpecialtyName = doctor.specialties[0]?.specialty?.name || '';

      const courses = await this.prisma.course.findMany({
        where: {
          status: 'PUBLISHED',
          ...(primarySpecialtyName
            ? { topics: { some: { topic: { name: { contains: primarySpecialtyName, mode: 'insensitive' } } } } }
            : {}),
          NOT: { id: { in: enrolledCourseIds } },
        },
        include: {
          instructor: { select: { fullName: true } },
          topics: { include: { topic: true } },
        },
        take: 5,
        orderBy: { rating: 'desc' },
      });

      return courses.map((c) => ({
        id: c.id,
        title: c.title,
        instructor: c.instructor.fullName,
        level: c.level,
        durationHours: c.durationHours,
        price: c.price,
        rating: c.rating,
        topics: c.topics.map((t) => t.topic.name),
      }));
    } catch (error) {
      this.logger.error('Failed to get relevant courses', error);
      return [];
    }
  }

  private async generateCareerInsights(doctorId: string, data: any) {
    const llm = this.llmFactory.getAdapter();
    if (!llm) return null;

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        specialties: { include: { specialty: true } },
        certifications: { include: { certification: true } },
        experiences: { include: { institution: true }, take: 3 },
      },
    });

    if (!doctor) return null;

    const prompt = `Você é um assistente especializado em desenvolvimento de carreira médica.

Perfil do médico:
- Nome: ${doctor.fullName}
- Ano de formatura: ${doctor.graduationYear || 'Não informado'}
- Especialidades: ${doctor.specialties.map((s) => s.specialty.name).join(', ')}
- Certificações: ${doctor.certifications.map((c) => c.certification.name).join(', ')}
- Experiências: ${doctor.experiences.map((e) => `${e.role} na ${e.institution?.name || 'Instituição'}`).join('; ')}

Dados de carreira disponíveis:
${JSON.stringify(data, null, 2)}

Gere insights sobre desenvolvimento de carreira para este médico. Responda em JSON:
{
  "careerStage": "início|desenvolvimento|consolidação|senior",
  "strengths": ["ponto forte 1", "ponto forte 2"],
  "gaps": ["lacuna 1", "lacuna 2"],
  "topRecommendations": [
    {
      "priority": "alta|média|baixa",
      "type": "certification|course|mentorship|milestone",
      "description": "descrição",
      "timeline": "prazo sugerido"
    }
  ],
  "networkingAdvice": "conselho de networking personalizado"
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
      this.logger.error('Failed to generate career insights', error);
      return null;
    }
  }
}
