import { Injectable } from '@nestjs/common';
import { Neo4jGdsService } from '../../database/neo4j/neo4j-gds.service';

/**
 * Thin service layer around Neo4jGdsService exposing graph insights
 * for the REST API. Handles null-safe fallbacks when GDS is unavailable.
 */
@Injectable()
export class GraphInsightsService {
  constructor(private readonly gds: Neo4jGdsService) {}

  async getInfluential(limit = 10) {
    return this.gds.getTopInfluentialDoctors(limit);
  }

  async getBridges(limit = 10) {
    return this.gds.getTopBridgeDoctors(limit);
  }

  async getCommunities() {
    return this.gds.getCommunities();
  }

  async getSimilar(doctorId: string, limit = 10) {
    return this.gds.getSimilarDoctors(doctorId, limit);
  }

  async getCommunityPeers(doctorId: string, limit = 20) {
    return this.gds.getCommunityPeers(doctorId, limit);
  }

  async triggerAlgorithms() {
    await this.gds.runAllAlgorithms();
    return { message: 'GDS algorithms triggered successfully' };
  }
}
