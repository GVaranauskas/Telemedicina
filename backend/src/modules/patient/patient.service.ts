import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma/prisma.service';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { EVENTS } from '../../events/events.constants';

@Injectable()
export class PatientService {
  private readonly logger = new Logger(PatientService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getProfile(patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        user: { select: { email: true, role: true, isVerified: true } },
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return patient;
  }

  async updateProfile(patientId: string, dto: UpdatePatientDto) {
    const patient = await this.prisma.patient.update({
      where: { id: patientId },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });

    this.eventEmitter.emit(EVENTS.PATIENT_UPDATED, {
      id: patient.id,
      fullName: patient.fullName,
    });

    return patient;
  }

  async getMyAppointments(patientId: string, query: {
    status?: string;
    upcoming?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { status, upcoming, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { patientId };

    if (status) {
      where.status = status;
    }
    if (upcoming) {
      where.scheduledAt = { gte: new Date() };
      where.status = { in: ['PENDING', 'CONFIRMED'] };
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
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
          workplace: {
            select: {
              id: true,
              name: true,
              street: true,
              number: true,
              neighborhood: true,
              city: true,
              state: true,
              zipCode: true,
            },
          },
        },
        orderBy: { scheduledAt: upcoming ? 'asc' : 'desc' },
        skip,
        take: Math.min(limit, 50),
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      data: appointments,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
