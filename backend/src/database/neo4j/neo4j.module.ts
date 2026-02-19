import { Global, Module } from '@nestjs/common';
import { Neo4jService } from './neo4j.service';
import { Neo4jSetupService } from './neo4j-setup.service';
import { Neo4jGdsService } from './neo4j-gds.service';

@Global()
@Module({
  providers: [Neo4jService, Neo4jSetupService, Neo4jGdsService],
  exports: [Neo4jService, Neo4jGdsService],
})
export class Neo4jModule {}
