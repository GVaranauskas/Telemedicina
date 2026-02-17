import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Neo4jService } from '../../database/neo4j/neo4j.service';
import { CreateJobDto, UpdateJobDto, ApplyJobDto } from './dto/create-job.dto';
import { EVENTS } from '../../events/events.constants';

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly neo4j: Neo4jService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(institutionId: string, dto: CreateJobDto) {
    const job = await this.prisma.job.create({
      data: {
        institutionId,
        title: dto.title,
        type: dto.type,
        description: dto.description,
        requirements: dto.requirements,
        salaryMin: dto.salaryMin,
        salaryMax: dto.salaryMax,
        shift: dto.shift,
        city: dto.city,
        state: dto.state.toUpperCase(),
        specialtyId: dto.specialtyId,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      include: {
        institution: { select: { id: true, name: true } },
        specialty: true,
      },
    });

    this.eventEmitter.emit(EVENTS.JOB_CREATED, {
      id: job.id,
      title: job.title,
      type: job.type,
      city: job.city,
      shift: job.shift,
      institutionId: job.institutionId,
    });

    return job;
  }

  async update(jobId: string, institutionId: string, dto: UpdateJobDto) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.institutionId !== institutionId) {
      throw new ForbiddenException('Not your institution');
    }

    return this.prisma.job.update({
      where: { id: jobId },
      data: {
        ...dto,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      include: { institution: { select: { id: true, name: true } } },
    });
  }

  async findById(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        institution: true,
        specialty: true,
        applications: {
          select: { id: true, doctorId: true, status: true, appliedAt: true },
        },
      },
    });

    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async search(query: {
    type?: string;
    shift?: string;
    specialtyId?: string;
    city?: string;
    state?: string;
    minSalary?: number;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const {
      type,
      shift,
      specialtyId,
      city,
      state,
      minSalary,
      isActive = true,
      page = 1,
      limit = 20,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = { isActive };
    if (type) where.type = type;
    if (shift) where.shift = shift;
    if (specialtyId) where.specialtyId = specialtyId;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (state) where.state = state.toUpperCase();
    if (minSalary) where.salaryMax = { gte: minSalary };

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        include: {
          institution: { select: { id: true, name: true, logoUrl: true } },
          specialty: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      data: jobs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async apply(jobId: string, doctorId: string, dto: ApplyJobDto) {
    const existing = await this.prisma.jobApplication.findUnique({
      where: { jobId_doctorId: { jobId, doctorId } },
    });

    if (existing) {
      throw new ConflictException('Already applied to this job');
    }

    const application = await this.prisma.jobApplication.create({
      data: {
        jobId,
        doctorId,
        coverLetter: dto.coverLetter,
      },
      include: {
        job: { select: { title: true, institution: { select: { name: true } } } },
      },
    });

    // Track in Neo4j
    await this.neo4j.write(
      `MATCH (d:Doctor {pgId: $doctorId})
       MATCH (j:Job {pgId: $jobId})
       MERGE (d)-[:APPLIED_TO {status: 'PENDING'}]->(j)`,
      { doctorId, jobId },
    );

    return application;
  }

  async getMyApplications(doctorId: string) {
    return this.prisma.jobApplication.findMany({
      where: { doctorId },
      include: {
        job: {
          include: {
            institution: { select: { id: true, name: true, logoUrl: true } },
            specialty: true,
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });
  }

  async getJobApplications(jobId: string, institutionId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.institutionId !== institutionId) {
      throw new ForbiddenException('Not your job listing');
    }

    return this.prisma.jobApplication.findMany({
      where: { jobId },
      include: {
        doctor: {
          include: {
            specialties: { include: { specialty: true } },
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });
  }

  async updateApplicationStatus(
    applicationId: string,
    status: 'ACCEPTED' | 'REJECTED',
  ) {
    return this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status, respondedAt: new Date() },
    });
  }

  // ─── Graph-powered recommendations ────────────────────────

  async getRecommendedJobs(doctorId: string, limit = 10) {
    // Try graph-based recommendations first
    let graphJobIds: string[] = [];
    try {
      const graphResults = await this.neo4j.read<any>(
        `MATCH (me:Doctor {pgId: $doctorId})-[:SPECIALIZES_IN]->(spec:Specialty)
         MATCH (j:Job)-[:REQUIRES_SPECIALTY]->(spec)
         RETURN DISTINCT j.pgId AS jobId
         LIMIT toInteger($limit)`,
        { doctorId, limit },
      );
      graphJobIds = graphResults.map((r: any) => r.jobId).filter(Boolean);
    } catch (e) {
      // Graph query may fail if no SPECIALIZES_IN relationships
    }

    // Fetch full job data from Prisma (either graph IDs or fallback)
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: { specialties: true },
    });

    if (graphJobIds.length >= limit) {
      // Fetch full job details for graph results
      return this.prisma.job.findMany({
        where: { id: { in: graphJobIds }, isActive: true },
        include: {
          institution: { select: { name: true } },
          specialty: true,
        },
        take: limit,
      });
    }

    // Fallback: use Prisma to find recommended jobs
    const specialtyIds = doctor?.specialties.map((s) => s.specialtyId) || [];
    const excludeIds = graphJobIds;

    const pgJobs = await this.prisma.job.findMany({
      where: {
        isActive: true,
        id: excludeIds.length > 0 ? { notIn: excludeIds } : undefined,
        OR: [
          ...(specialtyIds.length > 0 ? [{ specialtyId: { in: specialtyIds } }] : []),
          ...(doctor?.city ? [{ city: doctor.city }] : []),
        ],
      },
      include: {
        institution: { select: { name: true } },
        specialty: true,
      },
      take: limit - graphJobIds.length,
      orderBy: { createdAt: 'desc' },
    });

    // If we had graph results, fetch their full data and combine
    if (graphJobIds.length > 0) {
      const graphJobs = await this.prisma.job.findMany({
        where: { id: { in: graphJobIds }, isActive: true },
        include: {
          institution: { select: { name: true } },
          specialty: true,
        },
      });
      return [...graphJobs, ...pgJobs];
    }

    return pgJobs;
  }
}
