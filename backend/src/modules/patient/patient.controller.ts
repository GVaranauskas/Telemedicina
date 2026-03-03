import { Controller, Post, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PatientService } from './patient.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Patients')
@Controller('patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current patient profile' })
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.patientService.findByUserId(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current patient profile' })
  async updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body() data: { fullName?: string; phone?: string; dateOfBirth?: string },
  ) {
    return this.patientService.updateByUserId(userId, data);
  }

  @Post('register')
  async register(@Body() data: {
    email: string;
    password: string;
    fullName: string;
    cpf?: string;
    phone?: string;
  }) {
    const user = await this.patientService.create(data);
    
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        patientId: user.patient?.id,
      },
      message: 'Paciente registrado com sucesso!',
    };
  }
}
