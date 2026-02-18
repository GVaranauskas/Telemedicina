import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddSpecialtyDto {
  @ApiProperty({ description: 'Specialty ID' })
  @IsString()
  specialtyId: string;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiProperty({ required: false, description: 'RQE number' })
  @IsOptional()
  @IsString()
  rqeNumber?: string;
}

export class AddSkillDto {
  @ApiProperty({ description: 'Skill ID' })
  @IsString()
  skillId: string;
}

export class AddExperienceDto {
  @ApiProperty()
  @IsString()
  role: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  institutionId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  startDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}
