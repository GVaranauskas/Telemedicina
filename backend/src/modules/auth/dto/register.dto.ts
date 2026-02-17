import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'dr.joao@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MinhaS3nha!Forte' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Dr. João Silva' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  crm: string;

  @ApiProperty({ example: 'SP' })
  @IsString()
  @MaxLength(2)
  @MinLength(2)
  crmState: string;

  @ApiProperty({ example: '11999998888', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: UserRole, default: UserRole.DOCTOR })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
