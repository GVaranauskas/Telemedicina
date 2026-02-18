import { Global, Module } from '@nestjs/common';
import { Neo4jService } from './neo4j.service';
import { Neo4jSetupService } from './neo4j-setup.service';

@Global()
@Module({
  providers: [Neo4jService, Neo4jSetupService],
  exports: [Neo4jService],
})
export class Neo4jModule {}
