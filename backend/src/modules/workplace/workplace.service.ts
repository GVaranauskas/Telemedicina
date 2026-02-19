import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Neo4jService } from '../../database/neo4j/neo4j.service';
import { CreateWorkplaceDto, UpdateWorkplaceDto } from './dto/create-workplace.dto';
import { EVENTS } from '../../events/events.constants';

@Injectable()
export class WorkplaceService {
  private readonly logger = new Logger(WorkplaceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly neo4j: Neo4jService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(doctorId: string, dto: CreateWorkplaceDto) {
    const workplace = await this.prisma.doctorWorkplace.create({
      data: {
        doctorId,
        name: dto.name,
        phone: dto.phone,
        street: dto.street,
        number: dto.number,
        complement: dto.complement,
        neighborhood: dto.neighborhood,
        city: dto.city,
        state: dto.state.toUpperCase(),
        zipCode: dto.zipCode.replace(/\D/g, ''),
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    // Sync workplace to Neo4j for geospatial queries
    await this.syncWorkplaceToNeo4j(workplace);

    this.eventEmitter.emit(EVENTS.WORKPLACE_CREATED, {
      id: workplace.id,
      doctorId,
      city: workplace.city,
      state: workplace.state,
      latitude: workplace.latitude,
      longitude: workplace.longitude,
    });

    return workplace;
  }

  async update(workplaceId: string, doctorId: string, dto: UpdateWorkplaceDto) {
    const existing = await this.prisma.doctorWorkplace.findUnique({
      where: { id: workplaceId },
    });

    if (!existing) {
      throw new NotFoundException('Workplace not found');
    }
    if (existing.doctorId !== doctorId) {
      throw new ForbiddenException('Not your workplace');
    }

    const workplace = await this.prisma.doctorWorkplace.update({
      where: { id: workplaceId },
      data: {
        ...dto,
        state: dto.state?.toUpperCase(),
        zipCode: dto.zipCode?.replace(/\D/g, ''),
      },
    });

    await this.syncWorkplaceToNeo4j(workplace);

    return workplace;
  }

  async delete(workplaceId: string, doctorId: string) {
    const existing = await this.prisma.doctorWorkplace.findUnique({
      where: { id: workplaceId },
    });

    if (!existing) {
      throw new NotFoundException('Workplace not found');
    }
    if (existing.doctorId !== doctorId) {
      throw new ForbiddenException('Not your workplace');
    }

    await this.prisma.doctorWorkplace.delete({
      where: { id: workplaceId },
    });

    // Remove from Neo4j
    try {
      await this.neo4j.write(
        `MATCH (w:Workplace {pgId: $workplaceId}) DETACH DELETE w`,
        { workplaceId },
      );
    } catch (error) {
      this.logger.error('Failed to remove workplace from Neo4j', error);
    }
  }

  async getMyWorkplaces(doctorId: string) {
    return this.prisma.doctorWorkplace.findMany({
      where: { doctorId },
      include: {
        availabilities: {
          where: { isActive: true },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(workplaceId: string) {
    const workplace = await this.prisma.doctorWorkplace.findUnique({
      where: { id: workplaceId },
      include: {
        doctor: {
          select: {
            id: true,
            fullName: true,
            crm: true,
            crmState: true,
            profilePicUrl: true,
            specialties: { include: { specialty: true } },
          },
        },
        availabilities: {
          where: { isActive: true },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
    });

    if (!workplace) {
      throw new NotFoundException('Workplace not found');
    }

    return workplace;
  }

  private async syncWorkplaceToNeo4j(workplace: {
    id: string;
    doctorId: string;
    name: string;
    city: string;
    state: string;
    latitude: number;
    longitude: number;
  }) {
    try {
      await this.neo4j.write(
        `MATCH (d:Doctor {pgId: $doctorId})
         MERGE (w:Workplace {pgId: $workplaceId})
         ON CREATE SET
           w.name = $name,
           w.city = $city,
           w.state = $state,
           w.latitude = $latitude,
           w.longitude = $longitude,
           w.location = point({latitude: $latitude, longitude: $longitude})
         ON MATCH SET
           w.name = $name,
           w.city = $city,
           w.state = $state,
           w.latitude = $latitude,
           w.longitude = $longitude,
           w.location = point({latitude: $latitude, longitude: $longitude})
         MERGE (d)-[:WORKS_AT_LOCATION]->(w)
         MERGE (c:City {name: $city})
         MERGE (s:State {code: $state})
         MERGE (c)-[:IN_STATE]->(s)
         MERGE (w)-[:IN_CITY]->(c)`,
        {
          doctorId: workplace.doctorId,
          workplaceId: workplace.id,
          name: workplace.name,
          city: workplace.city,
          state: workplace.state,
          latitude: workplace.latitude,
          longitude: workplace.longitude,
        },
      );
    } catch (error) {
      this.logger.error('Failed to sync workplace to Neo4j', error);
    }
  }
}
