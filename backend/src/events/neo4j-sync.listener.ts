import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Neo4jService } from '../database/neo4j/neo4j.service';
import { EVENTS } from './events.constants';

@Injectable()
export class Neo4jSyncListener {
  private readonly logger = new Logger(Neo4jSyncListener.name);

  constructor(private readonly neo4j: Neo4jService) {}

  @OnEvent(EVENTS.DOCTOR_CREATED)
  async handleDoctorCreated(payload: {
    id: string;
    fullName: string;
    crm: string;
    crmState: string;
    profilePicUrl?: string;
  }) {
    try {
      await this.neo4j.write(
        `CREATE (d:Doctor {
          pgId: $id,
          fullName: $fullName,
          crm: $crm,
          crmState: $crmState,
          profilePicUrl: $profilePicUrl
        })`,
        payload,
      );
      this.logger.log(`Neo4j: Doctor node created for ${payload.crm}`);
    } catch (error) {
      this.logger.error(`Neo4j sync failed for doctor ${payload.id}`, error);
    }
  }

  @OnEvent(EVENTS.DOCTOR_UPDATED)
  async handleDoctorUpdated(payload: {
    id: string;
    fullName?: string;
    profilePicUrl?: string;
  }) {
    try {
      const setClauses: string[] = [];
      if (payload.fullName) setClauses.push('d.fullName = $fullName');
      if (payload.profilePicUrl)
        setClauses.push('d.profilePicUrl = $profilePicUrl');

      if (setClauses.length > 0) {
        await this.neo4j.write(
          `MATCH (d:Doctor {pgId: $id}) SET ${setClauses.join(', ')}`,
          payload,
        );
        this.logger.log(`Neo4j: Doctor node updated for ${payload.id}`);
      }
    } catch (error) {
      this.logger.error(`Neo4j sync failed for doctor ${payload.id}`, error);
    }
  }

  @OnEvent(EVENTS.INSTITUTION_CREATED)
  async handleInstitutionCreated(payload: {
    id: string;
    name: string;
    type: string;
    city: string;
    state: string;
  }) {
    try {
      await this.neo4j.write(
        `CREATE (i:Institution {
          pgId: $id,
          name: $name,
          type: $type,
          city: $city,
          state: $state
        })`,
        payload,
      );
      this.logger.log(`Neo4j: Institution node created for ${payload.name}`);
    } catch (error) {
      this.logger.error(
        `Neo4j sync failed for institution ${payload.id}`,
        error,
      );
    }
  }

  @OnEvent(EVENTS.JOB_CREATED)
  async handleJobCreated(payload: {
    id: string;
    title: string;
    type: string;
    city: string;
    shift: string;
    institutionId: string;
  }) {
    try {
      await this.neo4j.write(
        `MATCH (i:Institution {pgId: $institutionId})
         CREATE (j:Job {
           pgId: $id,
           title: $title,
           type: $type,
           city: $city,
           shift: $shift,
           isActive: true
         })
         CREATE (i)-[:POSTED]->(j)`,
        payload,
      );
      this.logger.log(`Neo4j: Job node created for ${payload.title}`);
    } catch (error) {
      this.logger.error(`Neo4j sync failed for job ${payload.id}`, error);
    }
  }
}
