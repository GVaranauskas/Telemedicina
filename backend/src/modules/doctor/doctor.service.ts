import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Neo4jService } from '../../database/neo4j/neo4j.service';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import {
  AddSpecialtyDto,
  AddSkillDto,
  AddExperienceDto,
} from './dto/add-specialty.dto';
import { EVENTS } from '../../events/events.constants';

@Injectable()
export class DoctorService {
  private readonly logger = new Logger(DoctorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly neo4j: Neo4jService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getProfile(doctorId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        user: { select: { email: true, role: true, isVerified: true } },
        specialties: { include: { specialty: true } },
        skills: { include: { skill: true } },
        experiences: {
          include: { institution: { select: { id: true, name: true } } },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return doctor;
  }

  async updateProfile(doctorId: string, dto: UpdateDoctorDto) {
    const doctor = await this.prisma.doctor.update({
      where: { id: doctorId },
      data: {
        ...dto,
      },
      include: {
        specialties: { include: { specialty: true } },
        skills: { include: { skill: true } },
      },
    });

    // Sync with Neo4j
    this.eventEmitter.emit(EVENTS.DOCTOR_UPDATED, {
      id: doctor.id,
      fullName: doctor.fullName,
      profilePicUrl: doctor.profilePicUrl,
    });

    // Sync location in Neo4j
    if (dto.city && dto.state) {
      await this.syncDoctorLocation(doctor.id, dto.city, dto.state);
    }

    return doctor;
  }

  async addSpecialty(doctorId: string, dto: AddSpecialtyDto) {
    const result = await this.prisma.doctorSpecialty.create({
      data: {
        doctorId,
        specialtyId: dto.specialtyId,
        isPrimary: dto.isPrimary || false,
        rqeNumber: dto.rqeNumber,
      },
      include: { specialty: true },
    });

    // Sync to Neo4j
    await this.neo4j.write(
      `MATCH (d:Doctor {pgId: $doctorId})
       MERGE (s:Specialty {pgId: $specialtyId})
       ON CREATE SET s.name = $specialtyName
       MERGE (d)-[:SPECIALIZES_IN {isPrimary: $isPrimary}]->(s)`,
      {
        doctorId,
        specialtyId: dto.specialtyId,
        specialtyName: result.specialty.name,
        isPrimary: dto.isPrimary || false,
      },
    );

    return result;
  }

  async removeSpecialty(doctorId: string, specialtyId: string) {
    await this.prisma.doctorSpecialty.delete({
      where: { doctorId_specialtyId: { doctorId, specialtyId } },
    });

    await this.neo4j.write(
      `MATCH (d:Doctor {pgId: $doctorId})-[r:SPECIALIZES_IN]->(s:Specialty {pgId: $specialtyId})
       DELETE r`,
      { doctorId, specialtyId },
    );
  }

  async addSkill(doctorId: string, dto: AddSkillDto) {
    const result = await this.prisma.doctorSkill.create({
      data: { doctorId, skillId: dto.skillId },
      include: { skill: true },
    });

    await this.neo4j.write(
      `MATCH (d:Doctor {pgId: $doctorId})
       MERGE (s:Skill {pgId: $skillId})
       ON CREATE SET s.name = $skillName
       MERGE (d)-[:HAS_SKILL]->(s)`,
      { doctorId, skillId: dto.skillId, skillName: result.skill.name },
    );

    return result;
  }

  async removeSkill(doctorId: string, skillId: string) {
    await this.prisma.doctorSkill.delete({
      where: { doctorId_skillId: { doctorId, skillId } },
    });

    await this.neo4j.write(
      `MATCH (d:Doctor {pgId: $doctorId})-[r:HAS_SKILL]->(s:Skill {pgId: $skillId})
       DELETE r`,
      { doctorId, skillId },
    );
  }

  async addExperience(doctorId: string, dto: AddExperienceDto) {
    const experience = await this.prisma.doctorExperience.create({
      data: {
        doctorId,
        institutionId: dto.institutionId,
        role: dto.role,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isCurrent: dto.isCurrent || false,
      },
      include: {
        institution: { select: { id: true, name: true } },
      },
    });

    // If linked to institution, create WORKS_AT in Neo4j
    if (dto.institutionId) {
      await this.neo4j.write(
        `MATCH (d:Doctor {pgId: $doctorId})
         MATCH (i:Institution {pgId: $institutionId})
         MERGE (d)-[:WORKS_AT {since: $startDate, role: $role}]->(i)`,
        {
          doctorId,
          institutionId: dto.institutionId,
          startDate: dto.startDate,
          role: dto.role,
        },
      );
    }

    return experience;
  }

  async removeExperience(experienceId: string) {
    await this.prisma.doctorExperience.delete({
      where: { id: experienceId },
    });
  }

  async searchDoctors(query: {
    name?: string;
    specialtyId?: string;
    city?: string;
    state?: string;
    page?: number;
    limit?: number;
  }) {
    const { name, specialtyId, city, state, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (name) {
      where.fullName = { contains: name, mode: 'insensitive' };
    }
    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }
    if (state) {
      where.state = state.toUpperCase();
    }
    if (specialtyId) {
      where.specialties = { some: { specialtyId } };
    }

    const [doctors, total] = await Promise.all([
      this.prisma.doctor.findMany({
        where,
        include: {
          specialties: { include: { specialty: true } },
          skills: { include: { skill: true } },
        },
        skip,
        take: limit,
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.doctor.count({ where }),
    ]);

    return {
      data: doctors,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAllSpecialties() {
    return this.prisma.specialty.findMany({ orderBy: { name: 'asc' } });
  }

  async getAllSkills() {
    return this.prisma.skill.findMany({ orderBy: { name: 'asc' } });
  }

  private async syncDoctorLocation(
    doctorId: string,
    city: string,
    state: string,
  ) {
    try {
      await this.neo4j.write(
        `MATCH (d:Doctor {pgId: $doctorId})
         MERGE (c:City {name: $city})
         MERGE (s:State {code: $state})
         MERGE (c)-[:IN_STATE]->(s)
         MERGE (d)-[:LOCATED_IN]->(c)`,
        { doctorId, city, state },
      );
    } catch (error) {
      this.logger.error('Failed to sync location to Neo4j', error);
    }
  }
}
