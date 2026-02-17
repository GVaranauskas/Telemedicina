import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AppointmentService } from './appointment.service';
import {
  CreateAppointmentDto,
  SearchDoctorsNearbyDto,
  CancelAppointmentDto,
} from './dto/create-appointment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Appointments')
@Controller('appointments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  // ─── Patient endpoints ─────────────────────────────────────────

  @Post('search-doctors')
  @ApiOperation({
    summary: 'Search doctors by proximity, specialty, and availability (patient)',
    description:
      'Finds doctors near the patient location, filtered by specialty and available time slots. ' +
      'Returns matched doctors sorted by distance and time proximity.',
  })
  async searchDoctorsNearby(@Body() dto: SearchDoctorsNearbyDto) {
    return this.appointmentService.searchDoctorsNearby(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Book an appointment (patient)' })
  async createAppointment(
    @CurrentUser('patientId') patientId: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentService.createAppointment(patientId, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an appointment (patient or doctor)' })
  async cancelAppointment(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.appointmentService.cancelAppointment(id, userId, role, dto);
  }

  // ─── Doctor endpoints ──────────────────────────────────────────

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm an appointment (doctor)' })
  async confirmAppointment(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.appointmentService.confirmAppointment(id, userId);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Mark appointment as completed (doctor)' })
  async completeAppointment(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('notes') notes?: string,
  ) {
    return this.appointmentService.completeAppointment(id, userId, notes);
  }

  @Get('doctor/me')
  @ApiOperation({ summary: 'Get my appointments as doctor' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getDoctorAppointments(
    @CurrentUser('doctorId') doctorId: string,
    @Query('status') status?: string,
    @Query('date') date?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.appointmentService.getDoctorAppointments(doctorId, {
      status,
      date,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }
}
