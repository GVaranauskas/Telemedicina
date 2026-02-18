import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PatientService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    email: string;
    password: string;
    fullName: string;
    cpf?: string;
    phone?: string;
  }) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: 'PATIENT',
        patient: {
          create: {
            fullName: data.fullName,
            cpf: data.cpf,
            phone: data.phone,
          },
        },
      },
      include: { patient: true },
    });

    return user;
  }

  async findById(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: { user: { select: { email: true } } },
    });
    
    if (!patient) throw new NotFoundException('Paciente não encontrado');
    return patient;
  }

  async findByUserId(userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
      include: { user: { select: { email: true } } },
    });
    
    if (!patient) throw new NotFoundException('Paciente não encontrado');
    return patient;
  }
}
