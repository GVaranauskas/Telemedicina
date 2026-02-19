import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';
import { AgenticSearchService } from './agentic-search.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class SearchQueryDto {
  @IsString()
  @MaxLength(500)
  query: string;
}

@ApiTags('Agentic Search')
@Controller('agentic-search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AgenticSearchController {
  constructor(
    private readonly agenticSearchService: AgenticSearchService,
  ) {}

  @Post('query')
  @ApiOperation({
    summary: 'Search using natural language (AI-powered)',
    description:
      'Send a natural language query and the AI agent will search the graph database to find relevant results.',
  })
  async query(
    @CurrentUser('doctorId') doctorId: string,
    @Body() dto: SearchQueryDto,
  ) {
    return this.agenticSearchService.query(doctorId, dto.query);
  }

  @Get('recommendations')
  @ApiOperation({
    summary: 'Get proactive AI recommendations',
    description:
      'Returns personalized recommendations based on your profile, connections, and graph analysis.',
  })
  async getRecommendations(@CurrentUser('doctorId') doctorId: string) {
    return this.agenticSearchService.getRecommendations(doctorId);
  }

  @Get('collaboration')
  @ApiOperation({
    summary: 'Get collaboration suggestions',
    description:
      'Returns opportunities for scientific collaboration: co-authors, study groups, research projects, and case studies.',
  })
  async getCollaborationSuggestions(@CurrentUser('doctorId') doctorId: string) {
    return this.agenticSearchService.getCollaborationSuggestions(doctorId);
  }

  @Get('career')
  @ApiOperation({
    summary: 'Get career development suggestions',
    description:
      'Returns career path progress, certification recommendations, mentorship opportunities, and relevant courses.',
  })
  async getCareerSuggestions(@CurrentUser('doctorId') doctorId: string) {
    return this.agenticSearchService.getCareerSuggestions(doctorId);
  }

  @Get('events')
  @ApiOperation({
    summary: 'Get event and education suggestions',
    description:
      'Returns upcoming events, speaking opportunities, course recommendations, and learning paths.',
  })
  async getEventSuggestions(@CurrentUser('doctorId') doctorId: string) {
    return this.agenticSearchService.getEventSuggestions(doctorId);
  }

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get comprehensive dashboard data',
    description:
      'Returns all agent suggestions combined: recommendations, collaboration, career, and events.',
  })
  async getDashboard(@CurrentUser('doctorId') doctorId: string) {
    return this.agenticSearchService.getDashboard(doctorId);
  }
}
