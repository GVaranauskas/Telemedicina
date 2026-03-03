import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GraphInsightsService } from './graph-insights.service';

@ApiTags('Graph Insights')
@Controller('graph')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GraphInsightsController {
  constructor(private readonly insights: GraphInsightsService) {}

  @Get('influential')
  @ApiOperation({ summary: 'Top influential doctors by PageRank' })
  async getInfluential(@Query('limit') limit?: number) {
    return this.insights.getInfluential(limit ? Number(limit) : 10);
  }

  @Get('bridges')
  @ApiOperation({ summary: 'Top bridge/broker doctors by betweenness centrality' })
  async getBridges(@Query('limit') limit?: number) {
    return this.insights.getBridges(limit ? Number(limit) : 10);
  }

  @Get('communities')
  @ApiOperation({ summary: 'Doctor communities detected by Louvain algorithm' })
  async getCommunities() {
    return this.insights.getCommunities();
  }

  @Get('similar/:doctorId')
  @ApiOperation({ summary: 'Doctors similar to a given doctor (Node Similarity / GDS)' })
  async getSimilar(
    @Param('doctorId') doctorId: string,
    @Query('limit') limit?: number,
  ) {
    return this.insights.getSimilar(doctorId, limit ? Number(limit) : 10);
  }

  @Get('community-peers')
  @ApiOperation({ summary: 'Peers in the same Louvain community as the current user' })
  async getCommunityPeers(
    @CurrentUser('doctorId') doctorId: string,
    @Query('limit') limit?: number,
  ) {
    return this.insights.getCommunityPeers(doctorId, limit ? Number(limit) : 10);
  }

  @Post('run-algorithms')
  @ApiOperation({ summary: 'Manually trigger GDS algorithm run (admin use)' })
  async triggerAlgorithms() {
    return this.insights.triggerAlgorithms();
  }
}
