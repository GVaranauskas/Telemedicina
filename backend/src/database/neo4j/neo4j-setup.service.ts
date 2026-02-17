import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Neo4jService } from './neo4j.service';

@Injectable()
export class Neo4jSetupService implements OnModuleInit {
  private readonly logger = new Logger(Neo4jSetupService.name);

  constructor(private readonly neo4j: Neo4jService) {}

  async onModuleInit() {
    await this.createConstraints();
    await this.createIndexes();
  }

  private async createConstraints() {
    const constraints = [
      'CREATE CONSTRAINT doctor_pgid IF NOT EXISTS FOR (d:Doctor) REQUIRE d.pgId IS UNIQUE',
      'CREATE CONSTRAINT institution_pgid IF NOT EXISTS FOR (i:Institution) REQUIRE i.pgId IS UNIQUE',
      'CREATE CONSTRAINT specialty_pgid IF NOT EXISTS FOR (s:Specialty) REQUIRE s.pgId IS UNIQUE',
      'CREATE CONSTRAINT skill_pgid IF NOT EXISTS FOR (s:Skill) REQUIRE s.pgId IS UNIQUE',
      'CREATE CONSTRAINT job_pgid IF NOT EXISTS FOR (j:Job) REQUIRE j.pgId IS UNIQUE',
      'CREATE CONSTRAINT city_name IF NOT EXISTS FOR (c:City) REQUIRE c.name IS UNIQUE',
      'CREATE CONSTRAINT state_code IF NOT EXISTS FOR (s:State) REQUIRE s.code IS UNIQUE',
      // New collaboration nodes
      'CREATE CONSTRAINT publication_pgid IF NOT EXISTS FOR (p:Publication) REQUIRE p.pgId IS UNIQUE',
      'CREATE CONSTRAINT casestudy_pgid IF NOT EXISTS FOR (c:CaseStudy) REQUIRE c.pgId IS UNIQUE',
      'CREATE CONSTRAINT studygroup_pgid IF NOT EXISTS FOR (s:StudyGroup) REQUIRE s.pgId IS UNIQUE',
      'CREATE CONSTRAINT researchproject_pgid IF NOT EXISTS FOR (r:ResearchProject) REQUIRE r.pgId IS UNIQUE',
      'CREATE CONSTRAINT topic_name IF NOT EXISTS FOR (t:Topic) REQUIRE t.name IS UNIQUE',
      // Career & Mentorship nodes
      'CREATE CONSTRAINT certification_pgid IF NOT EXISTS FOR (c:Certification) REQUIRE c.pgId IS UNIQUE',
      'CREATE CONSTRAINT careerpath_pgid IF NOT EXISTS FOR (c:CareerPath) REQUIRE c.pgId IS UNIQUE',
      'CREATE CONSTRAINT careermilestone_pgid IF NOT EXISTS FOR (m:CareerMilestone) REQUIRE m.pgId IS UNIQUE',
      'CREATE CONSTRAINT mentorship_pgid IF NOT EXISTS FOR (m:Mentorship) REQUIRE m.pgId IS UNIQUE',
      // Events & Courses nodes
      'CREATE CONSTRAINT event_pgid IF NOT EXISTS FOR (e:Event) REQUIRE e.pgId IS UNIQUE',
      'CREATE CONSTRAINT course_pgid IF NOT EXISTS FOR (c:Course) REQUIRE c.pgId IS UNIQUE',
      'CREATE CONSTRAINT topic_pgid IF NOT EXISTS FOR (t:Topic) REQUIRE t.pgId IS UNIQUE',
      // Workplace & Patient nodes
      'CREATE CONSTRAINT workplace_pgid IF NOT EXISTS FOR (w:Workplace) REQUIRE w.pgId IS UNIQUE',
      'CREATE CONSTRAINT patient_pgid IF NOT EXISTS FOR (p:Patient) REQUIRE p.pgId IS UNIQUE',
    ];

    for (const constraint of constraints) {
      try {
        await this.neo4j.write(constraint);
      } catch (error) {
        // Constraint may already exist
        this.logger.debug(`Constraint skipped: ${error.message}`);
      }
    }
    this.logger.log('Neo4j constraints ensured');
  }

  private async createIndexes() {
    const indexes = [
      'CREATE INDEX doctor_fullname IF NOT EXISTS FOR (d:Doctor) ON (d.fullName)',
      'CREATE INDEX doctor_crm IF NOT EXISTS FOR (d:Doctor) ON (d.crm, d.crmState)',
      'CREATE INDEX institution_name IF NOT EXISTS FOR (i:Institution) ON (i.name)',
      'CREATE INDEX institution_city IF NOT EXISTS FOR (i:Institution) ON (i.city, i.state)',
      'CREATE INDEX job_active IF NOT EXISTS FOR (j:Job) ON (j.isActive)',
      'CREATE INDEX specialty_name IF NOT EXISTS FOR (s:Specialty) ON (s.name)',
      // New collaboration indexes
      'CREATE INDEX publication_title IF NOT EXISTS FOR (p:Publication) ON (p.title)',
      'CREATE INDEX publication_type IF NOT EXISTS FOR (p:Publication) ON (p.publicationType)',
      'CREATE INDEX casestudy_status IF NOT EXISTS FOR (c:CaseStudy) ON (c.status)',
      'CREATE INDEX studygroup_public IF NOT EXISTS FOR (s:StudyGroup) ON (s.isPublic)',
      'CREATE INDEX researchproject_status IF NOT EXISTS FOR (r:ResearchProject) ON (r.status)',
      // Career & Mentorship indexes
      'CREATE INDEX certification_type IF NOT EXISTS FOR (c:Certification) ON (c.certificationType)',
      'CREATE INDEX certification_body IF NOT EXISTS FOR (c:Certification) ON (c.issuingBody)',
      'CREATE INDEX careerpath_official IF NOT EXISTS FOR (c:CareerPath) ON (c.isOfficial)',
      'CREATE INDEX mentorship_status IF NOT EXISTS FOR (m:Mentorship) ON (m.status)',
      // Influence indexes
      'CREATE INDEX doctor_pagerank IF NOT EXISTS FOR (d:Doctor) ON (d.pageRank)',
      'CREATE INDEX doctor_betweenness IF NOT EXISTS FOR (d:Doctor) ON (d.betweenness)',
      // Events & Courses indexes
      'CREATE INDEX event_type IF NOT EXISTS FOR (e:Event) ON (e.eventType)',
      'CREATE INDEX event_status IF NOT EXISTS FOR (e:Event) ON (e.status)',
      'CREATE INDEX event_startdate IF NOT EXISTS FOR (e:Event) ON (e.startDate)',
      'CREATE INDEX course_status IF NOT EXISTS FOR (c:Course) ON (c.status)',
      'CREATE INDEX topic_name IF NOT EXISTS FOR (t:Topic) ON (t.name)',
      // Workplace geospatial index for proximity search
      'CREATE POINT INDEX workplace_location IF NOT EXISTS FOR (w:Workplace) ON (w.location)',
      'CREATE INDEX workplace_city IF NOT EXISTS FOR (w:Workplace) ON (w.city, w.state)',
    ];

    for (const index of indexes) {
      try {
        await this.neo4j.write(index);
      } catch (error) {
        this.logger.debug(`Index skipped: ${error.message}`);
      }
    }
    this.logger.log('Neo4j indexes ensured');
  }
}
