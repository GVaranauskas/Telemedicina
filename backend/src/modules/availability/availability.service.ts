import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateAvailabilityDto, UpdateAvailabilityDto } from './dto/create-availability.dto';

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(doctorId: string, dto: CreateAvailabilityDto) {
    // Verify workplace belongs to doctor
    const workplace = await this.prisma.doctorWorkplace.findUnique({
      where: { id: dto.workplaceId },
    });

    if (!workplace) {
      throw new NotFoundException('Workplace not found');
    }
    if (workplace.doctorId !== doctorId) {
      throw new ForbiddenException('Not your workplace');
    }

    // Validate times
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    return this.prisma.doctorAvailability.create({
      data: {
        doctorId,
        workplaceId: dto.workplaceId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        slotDurationMin: dto.slotDurationMin || 30,
      },
      include: {
        workplace: {
          select: { id: true, name: true, city: true, state: true },
        },
      },
    });
  }

  async update(availabilityId: string, doctorId: string, dto: UpdateAvailabilityDto) {
    const existing = await this.prisma.doctorAvailability.findUnique({
      where: { id: availabilityId },
    });

    if (!existing) {
      throw new NotFoundException('Availability not found');
    }
    if (existing.doctorId !== doctorId) {
      throw new ForbiddenException('Not your availability');
    }

    const startTime = dto.startTime || existing.startTime;
    const endTime = dto.endTime || existing.endTime;
    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    return this.prisma.doctorAvailability.update({
      where: { id: availabilityId },
      data: dto,
      include: {
        workplace: {
          select: { id: true, name: true, city: true, state: true },
        },
      },
    });
  }

  async delete(availabilityId: string, doctorId: string) {
    const existing = await this.prisma.doctorAvailability.findUnique({
      where: { id: availabilityId },
    });

    if (!existing) {
      throw new NotFoundException('Availability not found');
    }
    if (existing.doctorId !== doctorId) {
      throw new ForbiddenException('Not your availability');
    }

    await this.prisma.doctorAvailability.delete({
      where: { id: availabilityId },
    });
  }

  async getMyAvailabilities(doctorId: string) {
    return this.prisma.doctorAvailability.findMany({
      where: { doctorId },
      include: {
        workplace: {
          select: { id: true, name: true, city: true, state: true, zipCode: true },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async getDoctorAvailability(doctorId: string) {
    return this.prisma.doctorAvailability.findMany({
      where: { doctorId, isActive: true },
      include: {
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
            latitude: true,
            longitude: true,
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }
}
