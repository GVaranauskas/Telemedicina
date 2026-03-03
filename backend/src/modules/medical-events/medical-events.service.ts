import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { EventsQueryDto } from './dto/events-query.dto';

@Injectable()
export class MedicalEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: EventsQueryDto) {
    const { type, isOnline, isFree, city, dateFrom, page = 1, limit = 20 } = query;

    const where: any = { status: { not: 'CANCELLED' } };

    if (type) where.eventType = type;
    if (isOnline !== undefined) where.isOnline = isOnline;
    if (isFree !== undefined) where.isFree = isFree;
    if (city) where.location = { contains: city, mode: 'insensitive' };
    if (dateFrom) where.startDate = { gte: new Date(dateFrom) };
    else where.startDate = { gte: new Date() };

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { startDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          organizer: { select: { id: true, name: true, city: true, logoUrl: true } },
          speakers: {
            include: {
              doctor: { select: { id: true, fullName: true, profilePicUrl: true } },
            },
            take: 3,
          },
          topics: { include: { topic: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        organizer: { select: { id: true, name: true, city: true, logoUrl: true, website: true } },
        speakers: {
          include: {
            doctor: {
              select: {
                id: true,
                crm: true,
                fullName: true,
                profilePicUrl: true,
              },
            },
          },
          orderBy: { orderNum: 'asc' },
        },
        topics: { include: { topic: { select: { id: true, name: true } } } },
        _count: { select: { attendees: true } },
      },
    });

    if (!event) throw new NotFoundException(`Event ${id} not found`);
    return event;
  }

  async attend(eventId: string, doctorId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException(`Event ${eventId} not found`);

    if (event.maxAttendees && event.attendeeCount >= event.maxAttendees) {
      throw new ConflictException('Event is at full capacity');
    }

    const existing = await this.prisma.eventAttendee.findFirst({
      where: { eventId, doctorId },
    });
    if (existing) throw new ConflictException('Already registered for this event');

    const [attendee] = await this.prisma.$transaction([
      this.prisma.eventAttendee.create({
        data: { eventId, doctorId },
      }),
      this.prisma.event.update({
        where: { id: eventId },
        data: { attendeeCount: { increment: 1 } },
      }),
    ]);

    return { message: 'Successfully registered for event', attendee };
  }

  async unattend(eventId: string, doctorId: string) {
    const existing = await this.prisma.eventAttendee.findFirst({
      where: { eventId, doctorId },
    });
    if (!existing) throw new NotFoundException('Registration not found');

    await this.prisma.$transaction([
      this.prisma.eventAttendee.delete({ where: { id: existing.id } }),
      this.prisma.event.update({
        where: { id: eventId },
        data: { attendeeCount: { decrement: 1 } },
      }),
    ]);

    return { message: 'Registration cancelled' };
  }

  async isAttending(eventId: string, doctorId: string) {
    const existing = await this.prisma.eventAttendee.findFirst({
      where: { eventId, doctorId },
    });
    return { attending: !!existing };
  }
}
