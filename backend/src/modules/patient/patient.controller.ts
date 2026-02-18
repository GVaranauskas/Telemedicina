import { Controller, Post, Body } from '@nestjs/common';
import { PatientService } from './patient.service';

@Controller('patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

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
