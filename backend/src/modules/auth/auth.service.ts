import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { LoginDto } from './dto/login.dto';
import { EVENTS } from '../../events/events.constants';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async register(dto: RegisterDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Check if CRM already exists
    const existingDoctor = await this.prisma.doctor.findUnique({
      where: { crm_crmState: { crm: dto.crm, crmState: dto.crmState } },
    });
    if (existingDoctor) {
      throw new ConflictException('CRM already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user + doctor in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role: dto.role || UserRole.DOCTOR,
        },
      });

      const doctor = await tx.doctor.create({
        data: {
          userId: user.id,
          fullName: dto.fullName,
          crm: dto.crm,
          crmState: dto.crmState.toUpperCase(),
          phone: dto.phone,
        },
      });

      return { user, doctor };
    });

    // Emit event to sync with Neo4j
    this.eventEmitter.emit(EVENTS.DOCTOR_CREATED, {
      id: result.doctor.id,
      fullName: result.doctor.fullName,
      crm: result.doctor.crm,
      crmState: result.doctor.crmState,
      profilePicUrl: null,
    });

    // Generate tokens
    const tokens = await this.generateTokens(
      result.user.id,
      result.user.email,
      result.user.role,
    );

    // Store refresh token
    await this.prisma.user.update({
      where: { id: result.user.id },
      data: { refreshToken: await bcrypt.hash(tokens.refreshToken, 10) },
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        doctorId: result.doctor.id,
      },
      ...tokens,
    };
  }

  async registerPatient(dto: RegisterPatientDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Check if CPF already exists
    if (dto.cpf) {
      const existingPatient = await this.prisma.patient.findUnique({
        where: { cpf: dto.cpf },
      });
      if (existingPatient) {
        throw new ConflictException('CPF already registered');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user + patient in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role: UserRole.PATIENT,
        },
      });

      const patient = await tx.patient.create({
        data: {
          userId: user.id,
          fullName: dto.fullName,
          cpf: dto.cpf,
          phone: dto.phone,
          state: dto.state,
          city: dto.city,
        },
      });

      return { user, patient };
    });

    // Generate tokens
    const tokens = await this.generateTokens(
      result.user.id,
      result.user.email,
      result.user.role,
    );

    // Store refresh token
    await this.prisma.user.update({
      where: { id: result.user.id },
      data: { refreshToken: await bcrypt.hash(tokens.refreshToken, 10) },
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        patientId: result.patient.id,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { doctor: true, institution: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Store refresh token hash
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(tokens.refreshToken, 10) },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        doctorId: user.doctor?.id,
        institutionId: user.institution?.id,
      },
      ...tokens,
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    const isRefreshValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isRefreshValid) {
      throw new UnauthorizedException('Access denied');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(tokens.refreshToken, 10) },
    });

    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET') || 'default-secret',
        expiresIn: 900, // 15 minutes
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'default-refresh-secret',
        expiresIn: 604800, // 7 days
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
