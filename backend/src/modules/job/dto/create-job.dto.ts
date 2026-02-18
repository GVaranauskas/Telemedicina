import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JobType, JobShift } from '@prisma/client';

export class CreateJobDto {
  @ApiProperty({ example: 'Plantão UTI Adulto - 12h' })
  @IsString()
  title: string;

  @ApiProperty({ enum: JobType })
  @IsEnum(JobType)
  type: JobType;

  @ApiProperty({ example: 'Plantão de 12h na UTI adulto, experiência em ventilação mecânica necessária.' })
  @IsString()
  description: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  requirements?: string;

  @ApiProperty({ required: false, example: 1500 })
  @IsOptional()
  @IsNumber()
  salaryMin?: number;

  @ApiProperty({ required: false, example: 2500 })
  @IsOptional()
  @IsNumber()
  salaryMax?: number;

  @ApiProperty({ enum: JobShift })
  @IsEnum(JobShift)
  shift: JobShift;

  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'SP' })
  @IsString()
  state: string;

  @ApiProperty({ required: false, description: 'Specialty ID' })
  @IsOptional()
  @IsString()
  specialtyId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateJobDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @IsNumber()
  salaryMin?: number;

  @IsOptional()
  @IsNumber()
  salaryMax?: number;

  @IsOptional()
  @IsEnum(JobShift)
  shift?: JobShift;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class ApplyJobDto {
  @ApiProperty({ required: false, example: 'Tenho 5 anos de experiência em UTI...' })
  @IsOptional()
  @IsString()
  coverLetter?: string;
}
