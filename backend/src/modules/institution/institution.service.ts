import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Neo4jService } from '../../database/neo4j/neo4j.service';
import {
  CreateInstitutionDto,
  UpdateInstitutionDto,
} from './dto/create-institution.dto';
import { EVENTS } from '../../events/events.constants';

@Injectable()
export class InstitutionService {
  private readonly logger = new Logger(InstitutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly neo4j: Neo4jService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(adminUserId: string, dto: CreateInstitutionDto) {
    const institution = await this.prisma.institution.create({
      data: { adminUserId, ...dto },
    });

    this.eventEmitter.emit(EVENTS.INSTITUTION_CREATED, {
      id: institution.id,
      name: institution.name,
      type: institution.type,
      city: institution.city,
      state: institution.state,
    });

    return institution;
  }

  async update(id: string, dto: UpdateInstitutionDto) {
    const institution = await this.prisma.institution.update({
      where: { id },
      data: dto,
    });

    this.eventEmitter.emit(EVENTS.INSTITUTION_UPDATED, {
      id: institution.id,
      name: institution.name,
      type: institution.type,
      city: institution.city,
      state: institution.state,
    });

    return institution;
  }

  async findById(id: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id },
      include: {
        jobs: { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!institution) throw new NotFoundException('Institution not found');
    return institution;
  }

  async search(query: {
    name?: string;
    type?: string;
    city?: string;
    state?: string;
    page?: number;
    limit?: number;
  }) {
    const { name, type, city, state, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (name) where.name = { contains: name, mode: 'insensitive' };
    if (type) where.type = type;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (state) where.state = state.toUpperCase();

    const [institutions, total] = await Promise.all([
      this.prisma.institution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.institution.count({ where }),
    ]);

    return {
      data: institutions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
