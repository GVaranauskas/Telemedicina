import { Module } from '@nestjs/common';
import { Neo4jSyncListener } from './neo4j-sync.listener';

@Module({
  providers: [Neo4jSyncListener],
})
export class EventsModule {}
