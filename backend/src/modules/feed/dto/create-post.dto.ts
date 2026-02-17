import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PostType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  ARTICLE = 'ARTICLE',
  CLINICAL_CASE = 'CLINICAL_CASE',
}

export class CreatePostDto {
  @ApiProperty({ example: 'Caso interessante de cardiomiopatia...' })
  @IsString()
  content: string;

  @ApiProperty({ enum: PostType, default: PostType.TEXT })
  @IsOptional()
  @IsEnum(PostType)
  postType?: PostType;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @ApiProperty({ required: false, type: [String], example: ['cardiologia', 'casoclinico'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class CreateCommentDto {
  @ApiProperty({ example: 'Excelente caso, doutor!' })
  @IsString()
  content: string;
}
