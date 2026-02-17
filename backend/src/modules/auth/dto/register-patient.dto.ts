import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterPatientDto {
  @ApiProperty({ example: 'paciente@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MinhaS3nha!Forte' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Maria Oliveira' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '11999998888', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '123.456.789-00', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, { message: 'CPF inválido' })
  cpf?: string;

  @ApiProperty({ example: '1990-05-15', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ example: 'F', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;
}
