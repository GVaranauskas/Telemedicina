import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Neo4jService } from '../../database/neo4j/neo4j.service';
import {
  CreateAppointmentDto,
  SearchDoctorsNearbyDto,
  CancelAppointmentDto,
} from './dto/create-appointment.dto';
import { EVENTS } from '../../events/events.constants';
import { AppointmentType, DayOfWeek } from '@prisma/client';

// Map JS getDay() (0=Sunday) to Prisma DayOfWeek enum
const DAY_MAP: Record<number, DayOfWeek> = {
  0: DayOfWeek.SUNDAY,
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
};

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly neo4j: Neo4jService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Search doctors by proximity and availability.
   *
   * Algorithm:
   * 1. Use Neo4j geospatial query to find Workplace nodes within radius
   * 2. Filter by specialty if requested
   * 3. Check availability for the requested day/time
   * 4. Return matched doctors with distance, workplace info, and available slots
   */
  async searchDoctorsNearby(dto: SearchDoctorsNearbyDto) {
    const {
      latitude,
      longitude,
      radiusKm = 10,
      specialtyId,
      date,
      preferredTime,
      page = 1,
      limit = 20,
    } = dto;

    const radiusMeters = radiusKm * 1000;

    // Step 1: Find nearby workplaces via Neo4j geospatial index
    let cypher = `
      MATCH (d:Doctor)-[:WORKS_AT_LOCATION]->(w:Workplace)
      WHERE point.distance(w.location, point({latitude: $lat, longitude: $lon})) <= $radius
    `;
    const params: Record<string, any> = {
      lat: latitude,
      lon: longitude,
      radius: radiusMeters,
    };

    // Optional: filter by specialty
    if (specialtyId) {
      cypher += `
      MATCH (d)-[:SPECIALIZES_IN]->(s:Specialty {pgId: $specialtyId})
      `;
      params.specialtyId = specialtyId;
    }

    cypher += `
      RETURN d.pgId AS doctorId,
             w.pgId AS workplaceId,
             w.name AS workplaceName,
             w.city AS city,
             w.state AS state,
             point.distance(w.location, point({latitude: $lat, longitude: $lon})) AS distanceMeters,
             d.fullName AS doctorName,
             d.crm AS crm,
             d.crmState AS crmState,
             d.profilePicUrl AS profilePicUrl
      ORDER BY distanceMeters ASC
    `;

    const nearbyResults = await this.neo4j.read<{
      doctorId: string;
      workplaceId: string;
      workplaceName: string;
      city: string;
      state: string;
      distanceMeters: number;
      doctorName: string;
      crm: string;
      crmState: string;
      profilePicUrl: string | null;
    }>(cypher, params);

    if (nearbyResults.length === 0) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    // Step 2: Check availability from PostgreSQL
    const workplaceIds = nearbyResults.map((r) => r.workplaceId);
    const doctorIds = [...new Set(nearbyResults.map((r) => r.doctorId))];

    // Determine the day of week for filtering
    let targetDayOfWeek: DayOfWeek | undefined;
    let targetDate: Date | undefined;
    if (date) {
      targetDate = new Date(date);
      targetDayOfWeek = DAY_MAP[targetDate.getUTCDay()];
    }

    const availabilityWhere: any = {
      doctorId: { in: doctorIds },
      workplaceId: { in: workplaceIds },
      isActive: true,
    };

    if (targetDayOfWeek) {
      availabilityWhere.dayOfWeek = targetDayOfWeek;
    }

    const availabilities = await this.prisma.doctorAvailability.findMany({
      where: availabilityWhere,
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
    });

    // Step 3: Get existing appointments for conflict checking
    let existingAppointments: { doctorId: string; scheduledAt: Date }[] = [];
    if (targetDate) {
      const dayStart = new Date(targetDate);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setUTCHours(23, 59, 59, 999);

      existingAppointments = await this.prisma.appointment.findMany({
        where: {
          doctorId: { in: doctorIds },
          scheduledAt: { gte: dayStart, lte: dayEnd },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        select: { doctorId: true, scheduledAt: true },
      });
    }

    // Step 4: Build matched results - combine proximity with availability
    const availByDoctor = new Map<string, typeof availabilities>();
    for (const avail of availabilities) {
      const key = `${avail.doctorId}:${avail.workplaceId}`;
      if (!availByDoctor.has(key)) {
        availByDoctor.set(key, []);
      }
      availByDoctor.get(key)!.push(avail);
    }

    // Get doctor specialties for display
    const doctorSpecialties = await this.prisma.doctorSpecialty.findMany({
      where: { doctorId: { in: doctorIds } },
      include: { specialty: true },
    });

    const specialtiesByDoctor = new Map<string, string[]>();
    for (const ds of doctorSpecialties) {
      if (!specialtiesByDoctor.has(ds.doctorId)) {
        specialtiesByDoctor.set(ds.doctorId, []);
      }
      specialtiesByDoctor.get(ds.doctorId)!.push(ds.specialty.name);
    }

    const bookedSlots = new Set(
      existingAppointments.map(
        (a) => `${a.doctorId}:${a.scheduledAt.toISOString()}`,
      ),
    );

    const results: any[] = [];

    for (const nearby of nearbyResults) {
      const key = `${nearby.doctorId}:${nearby.workplaceId}`;
      const doctorAvails = availByDoctor.get(key);

      if (!doctorAvails || doctorAvails.length === 0) continue;

      // Generate available time slots
      const slots: string[] = [];
      for (const avail of doctorAvails) {
        const generatedSlots = this.generateTimeSlots(
          avail.startTime,
          avail.endTime,
          avail.slotDurationMin,
        );

        for (const slot of generatedSlots) {
          // Filter by preferred time if specified (within 2 hours window)
          if (preferredTime) {
            const slotMin = this.timeToMinutes(slot);
            const prefMin = this.timeToMinutes(preferredTime);
            if (Math.abs(slotMin - prefMin) > 120) continue;
          }

          // Check if slot is already booked
          if (targetDate) {
            const [h, m] = slot.split(':').map(Number);
            const slotDate = new Date(targetDate);
            slotDate.setUTCHours(h, m, 0, 0);
            const slotKey = `${nearby.doctorId}:${slotDate.toISOString()}`;
            if (bookedSlots.has(slotKey)) continue;
          }

          slots.push(slot);
        }
      }

      if (slots.length === 0) continue;

      results.push({
        doctor: {
          id: nearby.doctorId,
          fullName: nearby.doctorName,
          crm: nearby.crm,
          crmState: nearby.crmState,
          profilePicUrl: nearby.profilePicUrl,
          specialties: specialtiesByDoctor.get(nearby.doctorId) || [],
        },
        workplace: doctorAvails[0].workplace,
        distanceKm: Math.round((nearby.distanceMeters / 1000) * 10) / 10,
        availableSlots: slots,
        date: date || null,
      });
    }

    // Sort by distance first, then by number of available slots
    results.sort((a, b) => {
      if (preferredTime) {
        // If preferred time given, prioritize doctors with slots closest to it
        const aClosest = this.closestSlotDistance(a.availableSlots, preferredTime);
        const bClosest = this.closestSlotDistance(b.availableSlots, preferredTime);
        if (aClosest !== bClosest) return aClosest - bClosest;
      }
      return a.distanceKm - b.distanceKm;
    });

    // Paginate
    const total = results.length;
    const skip = (page - 1) * limit;
    const paginatedResults = results.slice(skip, skip + limit);

    return {
      data: paginatedResults,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createAppointment(patientId: string, dto: CreateAppointmentDto) {
    // Verify doctor exists
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: dto.doctorId },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    // Verify workplace exists and belongs to doctor
    const workplace = await this.prisma.doctorWorkplace.findUnique({
      where: { id: dto.workplaceId },
    });
    if (!workplace) {
      throw new NotFoundException('Workplace not found');
    }
    if (workplace.doctorId !== dto.doctorId) {
      throw new BadRequestException('Workplace does not belong to this doctor');
    }

    const scheduledAt = new Date(dto.scheduledAt);

    // Verify date is in the future
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('Cannot schedule in the past');
    }

    // Verify doctor has availability for this day/time
    const dayOfWeek = DAY_MAP[scheduledAt.getUTCDay()];
    const timeStr = `${String(scheduledAt.getUTCHours()).padStart(2, '0')}:${String(scheduledAt.getUTCMinutes()).padStart(2, '0')}`;

    const availability = await this.prisma.doctorAvailability.findFirst({
      where: {
        doctorId: dto.doctorId,
        workplaceId: dto.workplaceId,
        dayOfWeek,
        startTime: { lte: timeStr },
        endTime: { gt: timeStr },
        isActive: true,
      },
    });

    if (!availability) {
      throw new BadRequestException('Doctor is not available at this time and location');
    }

    // Check for existing appointment at same time (conflict)
    const conflictingAppointment = await this.prisma.appointment.findFirst({
      where: {
        doctorId: dto.doctorId,
        scheduledAt,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    if (conflictingAppointment) {
      throw new ConflictException('This time slot is already booked');
    }

    // Also check that patient doesn't have a conflicting appointment
    const patientConflict = await this.prisma.appointment.findFirst({
      where: {
        patientId,
        scheduledAt,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    if (patientConflict) {
      throw new ConflictException('You already have an appointment at this time');
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        patientId,
        doctorId: dto.doctorId,
        workplaceId: dto.workplaceId,
        scheduledAt,
        type: dto.type || AppointmentType.PRESENCIAL,
        reason: dto.reason,
        durationMin: availability.slotDurationMin,
      },
      include: {
        doctor: {
          select: {
            id: true,
            fullName: true,
            crm: true,
            crmState: true,
            profilePicUrl: true,
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
        patient: {
          select: { id: true, fullName: true, phone: true },
        },
      },
    });

    this.eventEmitter.emit(EVENTS.APPOINTMENT_CREATED, {
      id: appointment.id,
      patientId,
      doctorId: dto.doctorId,
      scheduledAt: appointment.scheduledAt,
    });

    return appointment;
  }

  async cancelAppointment(
    appointmentId: string,
    userId: string,
    userRole: string,
    dto: CancelAppointmentDto,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: { include: { user: true } }, doctor: { include: { user: true } } },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Verify ownership
    const isPatient = appointment.patient.user.id === userId;
    const isDoctor = appointment.doctor.user.id === userId;

    if (!isPatient && !isDoctor) {
      throw new ForbiddenException('Not your appointment');
    }

    if (appointment.status === 'CANCELLED_BY_PATIENT' || appointment.status === 'CANCELLED_BY_DOCTOR') {
      throw new BadRequestException('Appointment already cancelled');
    }

    if (appointment.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel a completed appointment');
    }

    const status = isPatient ? 'CANCELLED_BY_PATIENT' : 'CANCELLED_BY_DOCTOR';

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status,
        cancelledAt: new Date(),
        cancelReason: dto.reason,
      },
    });

    this.eventEmitter.emit(EVENTS.APPOINTMENT_CANCELLED, {
      id: updated.id,
      status,
      cancelledBy: isPatient ? 'patient' : 'doctor',
    });

    return updated;
  }

  async confirmAppointment(appointmentId: string, doctorUserId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: { include: { user: true } } },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.doctor.user.id !== doctorUserId) {
      throw new ForbiddenException('Not your appointment');
    }

    if (appointment.status !== 'PENDING') {
      throw new BadRequestException('Can only confirm pending appointments');
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CONFIRMED' },
    });
  }

  async completeAppointment(appointmentId: string, doctorUserId: string, notes?: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: { include: { user: true } } },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.doctor.user.id !== doctorUserId) {
      throw new ForbiddenException('Not your appointment');
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'COMPLETED', notes },
    });
  }

  async getDoctorAppointments(doctorId: string, query: {
    status?: string;
    date?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, date, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { doctorId };

    if (status) {
      where.status = status;
    }
    if (date) {
      const dayStart = new Date(date);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setUTCHours(23, 59, 59, 999);
      where.scheduledAt = { gte: dayStart, lte: dayEnd };
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          patient: {
            select: { id: true, fullName: true, phone: true, profilePicUrl: true },
          },
          workplace: {
            select: { id: true, name: true, city: true, state: true },
          },
        },
        orderBy: { scheduledAt: 'asc' },
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

  // ─── Helper methods ────────────────────────────────────────────

  private generateTimeSlots(
    startTime: string,
    endTime: string,
    slotDurationMin: number,
  ): string[] {
    const slots: string[] = [];
    let current = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    while (current + slotDurationMin <= end) {
      slots.push(this.minutesToTime(current));
      current += slotDurationMin;
    }

    return slots;
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private closestSlotDistance(slots: string[], preferredTime: string): number {
    const prefMin = this.timeToMinutes(preferredTime);
    let minDist = Infinity;
    for (const slot of slots) {
      const dist = Math.abs(this.timeToMinutes(slot) - prefMin);
      if (dist < minDist) minDist = dist;
    }
    return minDist;
  }
}
