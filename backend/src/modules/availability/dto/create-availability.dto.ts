import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DayOfWeek } from '@prisma/client';

export class CreateAvailabilityDto {
  @ApiProperty({ description: 'Workplace ID where this availability applies' })
  @IsString()
  @IsNotEmpty()
  workplaceId: string;

  @ApiProperty({ enum: DayOfWeek, example: 'MONDAY' })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({ example: '08:00', description: 'Start time HH:mm' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Horário inválido. Use HH:mm' })
  startTime: string;

  @ApiProperty({ example: '18:00', description: 'End time HH:mm' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Horário inválido. Use HH:mm' })
  endTime: string;

  @ApiProperty({ example: 30, description: 'Slot duration in minutes', required: false })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(120)
  slotDurationMin?: number;
}

export class UpdateAvailabilityDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Horário inválido' })
  startTime?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Horário inválido' })
  endTime?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(120)
  slotDurationMin?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
