import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PatientService } from './patient.service';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Patients')
@Controller('patients')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my patient profile' })
  async getMyProfile(@CurrentUser('patientId') patientId: string) {
    return this.patientService.getProfile(patientId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update my patient profile' })
  async updateMyProfile(
    @CurrentUser('patientId') patientId: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientService.updateProfile(patientId, dto);
  }

  @Get('me/appointments')
  @ApiOperation({ summary: 'Get my appointments' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'upcoming', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyAppointments(
    @CurrentUser('patientId') patientId: string,
    @Query('status') status?: string,
    @Query('upcoming') upcoming?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.patientService.getMyAppointments(patientId, {
      status,
      upcoming: upcoming === 'true',
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }
}
