import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Neo4jService } from '../../database/neo4j/neo4j.service';
import {
  ContractType,
  ContractStatus,
  ContactType,
  ContactOutcome,
  ShiftType,
  ShiftStatus,
  DepartmentType,
} from '@prisma/client';

@Injectable()
export class InstitutionWorkforceService {
  private readonly logger = new Logger(InstitutionWorkforceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly neo4j: Neo4jService,
  ) {}

  // ─── Guard helper ─────────────────────────────────────────────────────────

  private async assertAdmin(institutionId: string, userId: string) {
    const inst = await this.prisma.institution.findFirst({
      where: { id: institutionId, adminUserId: userId },
    });
    if (!inst) throw new ForbiddenException('Not authorized for this institution');
    return inst;
  }

  // ─── Departments ──────────────────────────────────────────────────────────

  async getDepartments(institutionId: string) {
    return this.prisma.department.findMany({
      where: { institutionId, isActive: true },
      include: {
        _count: { select: { shiftAssignments: true, shiftTemplates: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createDepartment(institutionId: string, dto: {
    name: string;
    type: DepartmentType;
    description?: string;
  }) {
    return this.prisma.department.create({
      data: { institutionId, ...dto },
    });
  }

  async updateDepartment(deptId: string, dto: Partial<{ name: string; description: string; isActive: boolean }>) {
    return this.prisma.department.update({ where: { id: deptId }, data: dto });
  }

  // ─── Roster ───────────────────────────────────────────────────────────────

  async getRoster(institutionId: string, from: Date, to: Date, departmentId?: string) {
    const where: any = {
      institutionId,
      date: { gte: from, lte: to },
    };
    if (departmentId) where.departmentId = departmentId;

    const shifts = await this.prisma.shiftAssignment.findMany({
      where,
      include: {
        doctor: {
          select: {
            id: true,
            fullName: true,
            profilePicUrl: true,
            specialties: { include: { specialty: { select: { name: true } } }, take: 1 },
          },
        },
        department: { select: { id: true, name: true, type: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    // Also fetch shift templates to show unfilled slots
    const templates = await this.prisma.shiftTemplate.findMany({
      where: { institutionId, ...(departmentId ? { departmentId } : {}), isActive: true },
      include: { department: { select: { name: true } } },
    });

    return { shifts, templates };
  }

  async getCoverageStats(institutionId: string, from: Date, to: Date) {
    const shifts = await this.prisma.shiftAssignment.findMany({
      where: { institutionId, date: { gte: from, lte: to } },
      select: { status: true, shiftType: true, departmentId: true },
    });

    const total = shifts.length;
    const confirmed = shifts.filter(s => s.status === 'CONFIRMED' || s.status === 'COMPLETED').length;
    const scheduled = shifts.filter(s => s.status === 'SCHEDULED').length;
    const cancelled = shifts.filter(s => s.status === 'CANCELLED').length;

    return {
      total,
      confirmed,
      scheduled,
      cancelled,
      coverageRate: total > 0 ? Math.round((confirmed / total) * 100) : 0,
    };
  }

  // ─── Shifts ───────────────────────────────────────────────────────────────

  async createShift(institutionId: string, dto: {
    doctorId: string;
    departmentId?: string;
    date: Date;
    startTime: string;
    endTime: string;
    shiftType: ShiftType;
    notes?: string;
    jobId?: string;
  }) {
    return this.prisma.shiftAssignment.create({
      data: { institutionId, ...dto },
      include: {
        doctor: { select: { id: true, fullName: true } },
        department: { select: { id: true, name: true } },
      },
    });
  }

  async updateShiftStatus(shiftId: string, status: ShiftStatus, notes?: string) {
    return this.prisma.shiftAssignment.update({
      where: { id: shiftId },
      data: { status, ...(notes ? { notes } : {}) },
    });
  }

  async bulkDispatchShifts(institutionId: string, dto: {
    date: Date;
    startTime: string;
    endTime: string;
    shiftType: ShiftType;
    departmentId?: string;
    specialtyId?: string;
    requiredDoctors: number;
    notes?: string;
  }) {
    // Find available doctors matching specialty, not blocked and not already assigned
    const blockedDoctorIds = await this.prisma.scheduleBlock.findMany({
      where: {
        startDate: { lte: dto.date },
        endDate: { gte: dto.date },
      },
      select: { doctorId: true },
    }).then(blocks => blocks.map(b => b.doctorId));

    const assignedDoctorIds = await this.prisma.shiftAssignment.findMany({
      where: {
        date: dto.date,
        startTime: dto.startTime,
        status: { not: 'CANCELLED' },
      },
      select: { doctorId: true },
    }).then(s => s.map(s => s.doctorId));

    const excludedIds = [...new Set([...blockedDoctorIds, ...assignedDoctorIds])];

    const doctorWhere: any = {
      id: { notIn: excludedIds.length > 0 ? excludedIds : ['__none__'] },
    };

    if (dto.specialtyId) {
      doctorWhere.specialties = { some: { specialtyId: dto.specialtyId } };
    }

    const candidates = await this.prisma.doctor.findMany({
      where: doctorWhere,
      select: { id: true, fullName: true, city: true },
      take: dto.requiredDoctors * 3,
    });

    // Create job posting for the bulk dispatch
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { name: true, city: true, state: true },
    });

    if (!institution) throw new NotFoundException('Institution not found');

    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const dayName = dayNames[new Date(dto.date).getDay()];

    const job = await this.prisma.job.create({
      data: {
        institutionId,
        title: `Plantão ${dayName} ${dto.startTime}-${dto.endTime}`,
        type: dto.shiftType === 'CONSULTA' ? 'CONSULTA' : 'PLANTAO',
        description: `Vaga urgente para ${dto.shiftType} em ${institution.name}. Data: ${dto.date.toLocaleDateString('pt-BR')}. Horário: ${dto.startTime}-${dto.endTime}.`,
        shift: dto.startTime >= '19:00' ? 'NOTURNO' : 'DIURNO',
        city: institution.city,
        state: institution.state,
        specialtyId: dto.specialtyId,
        isActive: true,
        startsAt: dto.date,
      },
    });

    return {
      job,
      candidates: candidates.slice(0, dto.requiredDoctors),
      totalCandidatesFound: candidates.length,
    };
  }

  // ─── Contracts ────────────────────────────────────────────────────────────

  async getContracts(institutionId: string, filters?: { status?: ContractStatus; doctorId?: string }) {
    const where: any = { institutionId };
    if (filters?.status) where.status = filters.status;
    if (filters?.doctorId) where.doctorId = filters.doctorId;

    return this.prisma.institutionContract.findMany({
      where,
      include: {
        doctor: { select: { id: true, fullName: true, profilePicUrl: true, crm: true, crmState: true } },
        specialty: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createContract(institutionId: string, dto: {
    doctorId: string;
    type: ContractType;
    startDate: Date;
    endDate?: Date;
    hourlyRate?: number;
    monthlyRate?: number;
    specialtyId?: string;
    terms?: string;
    notes?: string;
  }) {
    return this.prisma.institutionContract.create({
      data: { institutionId, ...dto },
      include: {
        doctor: { select: { id: true, fullName: true } },
        specialty: { select: { name: true } },
      },
    });
  }

  async updateContractStatus(contractId: string, status: ContractStatus) {
    return this.prisma.institutionContract.update({
      where: { id: contractId },
      data: { status },
    });
  }

  async getContractStats(institutionId: string) {
    const contracts = await this.prisma.institutionContract.findMany({
      where: { institutionId },
      select: { status: true, endDate: true },
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
      total: contracts.length,
      active: contracts.filter(c => c.status === 'ACTIVE').length,
      expiringSoon: contracts.filter(c =>
        c.status === 'ACTIVE' && c.endDate && c.endDate <= thirtyDaysFromNow
      ).length,
      expired: contracts.filter(c => c.status === 'EXPIRED').length,
      pendingSignature: contracts.filter(c => c.status === 'PENDING_SIGNATURE').length,
    };
  }

  // ─── Contact Logs (CRM) ───────────────────────────────────────────────────

  async getContactLogs(institutionId: string, filters?: { doctorId?: string; outcome?: ContactOutcome }) {
    const where: any = { institutionId };
    if (filters?.doctorId) where.doctorId = filters.doctorId;
    if (filters?.outcome) where.outcome = filters.outcome;

    return this.prisma.contactLog.findMany({
      where,
      include: {
        doctor: {
          select: {
            id: true, fullName: true, profilePicUrl: true, city: true,
            specialties: { include: { specialty: { select: { name: true } } }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createContactLog(institutionId: string, dto: {
    doctorId: string;
    type: ContactType;
    outcome: ContactOutcome;
    notes?: string;
    followUpDate?: Date;
  }) {
    return this.prisma.contactLog.create({
      data: { institutionId, ...dto },
      include: {
        doctor: { select: { id: true, fullName: true } },
      },
    });
  }

  async getPendingFollowUps(institutionId: string) {
    return this.prisma.contactLog.findMany({
      where: {
        institutionId,
        followUpDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        outcome: { in: ['INTERESTED', 'NO_RESPONSE', 'SCHEDULED_INTERVIEW'] },
      },
      include: {
        doctor: { select: { id: true, fullName: true, city: true } },
      },
      orderBy: { followUpDate: 'asc' },
    });
  }

  // ─── Workforce Search ─────────────────────────────────────────────────────

  async searchWorkforce(institutionId: string, filters: {
    specialtyId?: string;
    specialtyName?: string;
    date?: Date;
    city?: string;
    state?: string;
    limit?: number;
  }) {
    const limit = filters.limit || 20;

    // Doctors blocked on this date
    const blockedIds = filters.date
      ? await this.prisma.scheduleBlock.findMany({
          where: {
            startDate: { lte: filters.date },
            endDate: { gte: filters.date },
          },
          select: { doctorId: true },
        }).then(b => b.map(b => b.doctorId))
      : [];

    // Doctors already assigned on this date
    const assignedIds = filters.date
      ? await this.prisma.shiftAssignment.findMany({
          where: { date: filters.date, status: { not: 'CANCELLED' } },
          select: { doctorId: true },
        }).then(s => s.map(s => s.doctorId))
      : [];

    const excludedIds = [...new Set([...blockedIds, ...assignedIds])];

    const where: any = {
      id: { notIn: excludedIds.length > 0 ? excludedIds : ['__none__'] },
    };

    if (filters.specialtyId) {
      where.specialties = { some: { specialtyId: filters.specialtyId } };
    } else if (filters.specialtyName) {
      where.specialties = {
        some: { specialty: { name: { contains: filters.specialtyName, mode: 'insensitive' } } },
      };
    }

    if (filters.city) where.city = { contains: filters.city, mode: 'insensitive' };
    if (filters.state) where.state = filters.state.toUpperCase();

    const doctors = await this.prisma.doctor.findMany({
      where,
      include: {
        specialties: { include: { specialty: { select: { id: true, name: true } } } },
        contracts: {
          where: { institutionId, status: 'ACTIVE' },
          select: { id: true, type: true, status: true },
          take: 1,
        },
        contactLogs: {
          where: { institutionId },
          select: { outcome: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      take: limit,
      orderBy: { fullName: 'asc' },
    });

    // Also try Neo4j for graph-based enrichment
    let graphData: Record<string, any> = {};
    try {
      if (filters.specialtyName) {
        const neo4jResults = await this.neo4j.read(
          `MATCH (d:Doctor)-[:SPECIALIZES_IN]->(s:Specialty)
           WHERE s.name =~ $pattern
           OPTIONAL MATCH (d)-[c:CONNECTED_TO]-()
           WITH d, count(c) AS connections
           RETURN d.pgId AS pgId, connections
           LIMIT 50`,
          { pattern: `(?i).*${filters.specialtyName}.*` },
        );
        neo4jResults.forEach((r: any) => {
          graphData[r.pgId] = { connections: r.connections?.low ?? r.connections ?? 0 };
        });
      }
    } catch (e) {
      this.logger.warn('Neo4j enrichment failed for workforce search', e);
    }

    return doctors.map(d => ({
      id: d.id,
      fullName: d.fullName,
      crm: d.crm,
      crmState: d.crmState,
      city: d.city,
      state: d.state,
      profilePicUrl: d.profilePicUrl,
      specialties: d.specialties.map(s => s.specialty.name),
      hasActiveContract: d.contracts.length > 0,
      contractType: d.contracts[0]?.type ?? null,
      lastContactOutcome: d.contactLogs[0]?.outcome ?? null,
      lastContactDate: d.contactLogs[0]?.createdAt ?? null,
      isAvailableOnDate: !excludedIds.includes(d.id),
      networkConnections: graphData[d.id]?.connections ?? null,
    }));
  }

  // ─── Dashboard KPIs ───────────────────────────────────────────────────────

  async getDashboardKpis(institutionId: string) {
    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      activeContracts,
      openJobs,
      shiftsNext7Days,
      followUps,
      contractStats,
    ] = await Promise.all([
      this.prisma.institutionContract.count({ where: { institutionId, status: 'ACTIVE' } }),
      this.prisma.job.count({ where: { institutionId, isActive: true } }),
      this.prisma.shiftAssignment.findMany({
        where: { institutionId, date: { gte: now, lte: next7Days } },
        select: { status: true },
      }),
      this.getPendingFollowUps(institutionId),
      this.getContractStats(institutionId),
    ]);

    const totalShifts = shiftsNext7Days.length;
    const coveredShifts = shiftsNext7Days.filter(s => s.status === 'CONFIRMED' || s.status === 'SCHEDULED').length;

    return {
      activeContracts,
      openJobs,
      shiftsNext7Days: totalShifts,
      coveredShifts,
      uncoveredShifts: Math.max(0, totalShifts - coveredShifts),
      coverageRate: totalShifts > 0 ? Math.round((coveredShifts / totalShifts) * 100) : 100,
      pendingFollowUps: followUps.length,
      contractStats,
    };
  }
}
