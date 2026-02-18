import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '../../../database/neo4j/neo4j.service';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { LLMFactory } from '../llm/llm.factory';
import { safeParseJsonFromLLM, withRetry } from '../utils/llm-helpers';

@Injectable()
export class EventAgent {
  private readonly logger = new Logger(EventAgent.name);

  constructor(
    private readonly neo4j: Neo4jService,
    private readonly prisma: PrismaService,
    private readonly llmFactory: LLMFactory,
  ) {}

  async getEventSuggestions(doctorId: string) {
    const [
      upcomingEvents,
      speakingOpportunities,
      courseRecommendations,
      learningPath,
      attendedHistory,
    ] = await Promise.all([
      this.getUpcomingEvents(doctorId),
      this.getSpeakingOpportunities(doctorId),
      this.getCourseRecommendations(doctorId),
      this.getLearningPath(doctorId),
      this.getAttendedHistory(doctorId),
    ]);

    // Try LLM-powered insights
    let insights: any = null;
    try {
      insights = await this.generateEventInsights(doctorId, {
        upcomingEvents,
        speakingOpportunities,
        courseRecommendations,
        learningPath,
        attendedHistory,
      });
    } catch (error) {
      this.logger.warn('LLM event insights failed', error?.message);
    }

    return {
      upcomingEvents,
      speakingOpportunities,
      courseRecommendations,
      learningPath,
      attendedHistory,
      ...(insights ? { insights } : {}),
    };
  }

  private async getUpcomingEvents(doctorId: string) {
    try {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId },
        include: { specialties: { include: { specialty: true } } },
      });

      if (!doctor) return [];

      const specialtyNames = doctor.specialties.map((s) => s.specialty.name);

      const events = await this.prisma.event.findMany({
        where: {
          status: { in: ['UPCOMING', 'ONGOING'] },
          startDate: { gte: new Date() },
          NOT: {
            attendees: { some: { doctorId } },
          },
        },
        include: {
          organizer: { select: { name: true } },
          topics: { include: { topic: true } },
          _count: { select: { attendees: true, speakers: true } },
        },
        take: 10,
        orderBy: { startDate: 'asc' },
      });

      // Score events by relevance
      const scoredEvents = events.map((e) => {
        const topicMatch = e.topics.some((t) =>
          specialtyNames.some((s) =>
            t.topic.name.toLowerCase().includes(s.toLowerCase()) ||
            s.toLowerCase().includes(t.topic.name.toLowerCase())
          )
        );
        const score = topicMatch ? 2 : 1;
        return { ...e, score };
      });

      scoredEvents.sort((a, b) => b.score - a.score);

      return scoredEvents.slice(0, 8).map((e) => ({
        id: e.id,
        title: e.title,
        type: e.eventType,
        startDate: e.startDate,
        endDate: e.endDate,
        location: e.location,
        isOnline: e.isOnline,
        isFree: e.isFree,
        price: e.price,
        organizer: e.organizer.name,
        topics: e.topics.map((t) => t.topic.name),
        attendeeCount: e._count.attendees,
        speakerCount: e._count.speakers,
        relevanceScore: e.score,
      }));
    } catch (error) {
      this.logger.error('Failed to get upcoming events', error);
      return [];
    }
  }

  private async getSpeakingOpportunities(doctorId: string) {
    // Find events where the doctor could be a speaker based on their expertise
    try {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId },
        include: {
          specialties: { include: { specialty: true } },
          publications: { take: 5 },
          eventSpeakerAt: true,
        },
      });

      if (!doctor) return [];

      // Only suggest speaking if doctor has publications or experience
      if (doctor.publications.length === 0 && doctor.eventSpeakerAt.length === 0) {
        return [];
      }

      const events = await this.prisma.event.findMany({
        where: {
          status: { in: ['UPCOMING', 'ONGOING'] },
          startDate: { gte: new Date() },
          NOT: {
            speakers: { some: { doctorId } },
          },
        },
        include: {
          organizer: { select: { name: true, email: true } },
          topics: { include: { topic: true } },
        },
        take: 5,
        orderBy: { startDate: 'asc' },
      });

      // Match events to doctor's expertise
      const specialtyNames = doctor.specialties.map((s) => s.specialty.name);
      const matchedEvents = events.filter((e) =>
        e.topics.some((t) =>
          specialtyNames.some((s) =>
            t.topic.name.toLowerCase().includes(s.toLowerCase())
          )
        )
      );

      return matchedEvents.map((e) => ({
        id: e.id,
        title: e.title,
        type: e.eventType,
        startDate: e.startDate,
        organizer: e.organizer.name,
        contactEmail: e.organizer.email,
        relevantTopics: e.topics
          .filter((t) =>
            specialtyNames.some((s) =>
              t.topic.name.toLowerCase().includes(s.toLowerCase())
            )
          )
          .map((t) => t.topic.name),
        suggestedTopic: e.topics[0]?.topic.name,
      }));
    } catch (error) {
      this.logger.error('Failed to get speaking opportunities', error);
      return [];
    }
  }

  private async getCourseRecommendations(doctorId: string) {
    try {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId },
        include: {
          specialties: { include: { specialty: true } },
          skills: { include: { skill: true } },
          courseEnrollments: {
            where: { status: { in: ['ENROLLED', 'IN_PROGRESS'] } },
          },
        },
      });

      if (!doctor) return [];

      const enrolledCourseIds = doctor.courseEnrollments.map((e) => e.courseId);
      const specialtyNames = doctor.specialties.map((s) => s.specialty.name);
      const skillNames = doctor.skills.map((s) => s.skill.name);

      const courses = await this.prisma.course.findMany({
        where: {
          status: 'PUBLISHED',
          NOT: { id: { in: enrolledCourseIds } },
        },
        include: {
          instructor: { select: { fullName: true } },
          topics: { include: { topic: true } },
        },
        take: 20,
        orderBy: { rating: 'desc' },
      });

      // Score courses by relevance
      const scoredCourses = courses.map((c) => {
        let score = 0;
        for (const topic of c.topics) {
          if (specialtyNames.some((s) => topic.topic.name.toLowerCase().includes(s.toLowerCase()))) {
            score += 3;
          }
          if (skillNames.some((sk) => topic.topic.name.toLowerCase().includes(sk.toLowerCase()))) {
            score += 2;
          }
        }
        if (c.rating && c.rating > 4) score += 1;
        return { ...c, score };
      });

      scoredCourses.sort((a, b) => b.score - a.score);

      return scoredCourses.slice(0, 8).map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        instructor: c.instructor.fullName,
        level: c.level,
        durationHours: c.durationHours,
        price: c.price,
        rating: c.rating,
        topics: c.topics.map((t) => t.topic.name),
        relevanceScore: c.score,
      }));
    } catch (error) {
      this.logger.error('Failed to get course recommendations', error);
      return [];
    }
  }

  private async getLearningPath(doctorId: string) {
    try {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId },
        include: {
          specialties: { include: { specialty: true } },
          certifications: { include: { certification: true } },
          courseEnrollments: {
            include: { course: { select: { title: true } } },
          },
        },
      });

      if (!doctor) return null;

      const specialtyNames = doctor.specialties.map((s) => s.specialty.name);

      // Get suggested certifications
      const existingCertIds = doctor.certifications.map((c) => c.certificationId);
      const suggestedCerts = await this.prisma.certification.findMany({
        where: {
          OR: [
            { specialty: { name: { in: specialtyNames } } },
            { certificationType: 'CONTINUING_EDUCATION' },
          ],
          NOT: { id: { in: existingCertIds } },
        },
        take: 5,
      });

      // Calculate current progress
      const completedCourses = doctor.courseEnrollments.filter(
        (e) => e.status === 'COMPLETED'
      ).length;
      const inProgressCourses = doctor.courseEnrollments.filter(
        (e) => e.status === 'IN_PROGRESS'
      ).length;

      return {
        currentProgress: {
          completedCourses,
          inProgressCourses,
          certifications: doctor.certifications.length,
        },
        suggestedCertifications: suggestedCerts.map((c) => ({
          name: c.name,
          type: c.certificationType,
          issuingBody: c.issuingBody,
          priority: c.certificationType === 'CONTINUING_EDUCATION' ? 'high' : 'medium',
        })),
        nextSteps: this.generateNextSteps(doctor, suggestedCerts),
      };
    } catch (error) {
      this.logger.error('Failed to get learning path', error);
      return null;
    }
  }

  private generateNextSteps(doctor: any, suggestedCerts: any[]) {
    const steps: string[] = [];

    // Check for in-progress courses
    const inProgress = doctor.courseEnrollments.filter(
      (e: any) => e.status === 'IN_PROGRESS'
    );
    if (inProgress.length > 0) {
      steps.push(`Complete seu curso em andamento: ${inProgress[0].course.title}`);
    }

    // Check for expiring certifications
    const expiringCerts = doctor.certifications.filter((c: any) => {
      if (!c.expiryDate) return false;
      const monthsUntilExpiry = Math.floor(
        (new Date(c.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
      );
      return monthsUntilExpiry <= 6;
    });
    if (expiringCerts.length > 0) {
      steps.push(`Renove sua certificação: ${expiringCerts[0].certification.name}`);
    }

    // Suggest new certifications
    if (suggestedCerts.length > 0) {
      steps.push(`Considere obter: ${suggestedCerts[0].name}`);
    }

    return steps;
  }

  private async getAttendedHistory(doctorId: string) {
    try {
      const attended = await this.prisma.eventAttendee.findMany({
        where: { doctorId },
        include: {
          event: {
            include: {
              organizer: { select: { name: true } },
              topics: { include: { topic: true } },
            },
          },
        },
        orderBy: { registeredAt: 'desc' },
        take: 10,
      });

      return attended.map((a) => ({
        eventId: a.eventId,
        eventTitle: a.event.title,
        eventType: a.event.eventType,
        startDate: a.event.startDate,
        organizer: a.event.organizer.name,
        topics: a.event.topics.map((t) => t.topic.name),
        registeredAt: a.registeredAt,
        attendedAt: a.attendedAt,
        hasCertificate: !!a.certificateUrl,
      }));
    } catch (error) {
      this.logger.error('Failed to get attended history', error);
      return [];
    }
  }

  private async generateEventInsights(doctorId: string, data: any) {
    const llm = this.llmFactory.getAdapter();
    if (!llm) return null;

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        specialties: { include: { specialty: true } },
        eventAttendances: { include: { event: true } },
        courseEnrollments: true,
      },
    });

    if (!doctor) return null;

    const prompt = `Você é um assistente especializado em educação médica continuada.

Perfil do médico:
- Nome: ${doctor.fullName}
- Especialidades: ${doctor.specialties.map((s) => s.specialty.name).join(', ')}
- Eventos participados: ${doctor.eventAttendances.length}
- Cursos em andamento: ${doctor.courseEnrollments.filter((e) => e.status !== 'COMPLETED').length}

Dados de eventos e cursos disponíveis:
${JSON.stringify(data, null, 2)}

Gere insights sobre oportunidades de educação continuada. Responda em JSON:
{
  "summary": "resumo das oportunidades",
  "educationGoals": [
    {
      "goal": "objetivo",
      "priority": "alta|média|baixa",
      "deadline": "prazo sugerido"
    }
  ],
  "eventRecommendations": [
    {
      "eventId": "id do evento",
      "reason": "razão da recomendação"
    }
  ],
  "courseRecommendations": [
    {
      "courseId": "id do curso",
      "reason": "razão da recomendação"
    }
  ],
  "speakingPotential": "avaliação sobre potencial como palestrante"
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
      this.logger.error('Failed to generate event insights', error);
      return null;
    }
  }
}
