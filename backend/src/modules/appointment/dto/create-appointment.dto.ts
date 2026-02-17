import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AppointmentType } from '@prisma/client';

export class CreateAppointmentDto {
  @ApiProperty({ description: 'Doctor ID' })
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ description: 'Workplace ID' })
  @IsString()
  @IsNotEmpty()
  workplaceId: string;

  @ApiProperty({ example: '2026-03-01T10:00:00Z', description: 'Date and time for the appointment' })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({ enum: AppointmentType, default: 'PRESENCIAL' })
  @IsOptional()
  @IsEnum(AppointmentType)
  type?: AppointmentType;

  @ApiProperty({ example: 'Dor nas costas há 2 semanas', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SearchDoctorsNearbyDto {
  @ApiProperty({ example: -23.5613, description: 'Patient latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: -46.6560, description: 'Patient longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ example: 10, description: 'Search radius in km', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  radiusKm?: number;

  @ApiProperty({ description: 'Specialty ID to filter', required: false })
  @IsOptional()
  @IsString()
  specialtyId?: string;

  @ApiProperty({ example: '2026-03-01', description: 'Desired date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiProperty({ example: '10:00', description: 'Preferred start time (HH:mm)', required: false })
  @IsOptional()
  @IsString()
  preferredTime?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class CancelAppointmentDto {
  @ApiProperty({ example: 'Imprevisto pessoal', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
