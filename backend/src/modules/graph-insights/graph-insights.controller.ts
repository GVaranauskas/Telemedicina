import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Neo4jGdsService } from '../../database/neo4j/neo4j-gds.service';

@ApiTags('Graph Insights')
@Controller('graph')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GraphInsightsController {
  constructor(private readonly gds: Neo4jGdsService) {}

  @Get('influential')
  @ApiOperation({ summary: 'Top influential doctors by PageRank' })
  async getInfluential(@Query('limit') limit?: number) {
    return this.gds.getTopInfluentialDoctors(limit ? Number(limit) : 10);
  }

  @Get('bridges')
  @ApiOperation({ summary: 'Top bridge/broker doctors by betweenness centrality' })
  async getBridges(@Query('limit') limit?: number) {
    return this.gds.getTopBridgeDoctors(limit ? Number(limit) : 10);
  }

  @Get('communities')
  @ApiOperation({ summary: 'Doctor communities detected by Louvain algorithm' })
  async getCommunities() {
    return this.gds.getCommunities();
  }

  @Get('similar/:doctorId')
  @ApiOperation({ summary: 'Doctors similar to a given doctor' })
  async getSimilar(
    @Param('doctorId') doctorId: string,
    @Query('limit') limit?: number,
  ) {
    return this.gds.getSimilarDoctors(doctorId, limit ? Number(limit) : 10);
  }

  @Get('community-peers')
  @ApiOperation({ summary: 'Peers in the same community as the current user' })
  async getCommunityPeers(
    @CurrentUser('doctorId') doctorId: string,
    @Query('limit') limit?: number,
  ) {
    return this.gds.getCommunityPeers(doctorId, limit ? Number(limit) : 10);
  }
}
