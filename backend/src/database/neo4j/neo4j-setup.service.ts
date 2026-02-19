import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Neo4jService } from './neo4j.service';

@Injectable()
export class Neo4jSetupService implements OnModuleInit {
  private readonly logger = new Logger(Neo4jSetupService.name);

  constructor(private readonly neo4j: Neo4jService) {}

  async onModuleInit() {
    await this.createConstraints();
    await this.createIndexes();
    await this.createFullTextIndexes();
    await this.verifyGdsPlugin();
  }

  private async createConstraints() {
    const constraints = [
      // Core entities
      'CREATE CONSTRAINT doctor_pgid IF NOT EXISTS FOR (d:Doctor) REQUIRE d.pgId IS UNIQUE',
      'CREATE CONSTRAINT institution_pgid IF NOT EXISTS FOR (i:Institution) REQUIRE i.pgId IS UNIQUE',
      'CREATE CONSTRAINT specialty_pgid IF NOT EXISTS FOR (s:Specialty) REQUIRE s.pgId IS UNIQUE',
      'CREATE CONSTRAINT skill_pgid IF NOT EXISTS FOR (s:Skill) REQUIRE s.pgId IS UNIQUE',
      'CREATE CONSTRAINT job_pgid IF NOT EXISTS FOR (j:Job) REQUIRE j.pgId IS UNIQUE',
      'CREATE CONSTRAINT city_name IF NOT EXISTS FOR (c:City) REQUIRE c.name IS UNIQUE',
      'CREATE CONSTRAINT state_code IF NOT EXISTS FOR (s:State) REQUIRE s.code IS UNIQUE',
      // Collaboration nodes
      'CREATE CONSTRAINT publication_pgid IF NOT EXISTS FOR (p:Publication) REQUIRE p.pgId IS UNIQUE',
      'CREATE CONSTRAINT casestudy_pgid IF NOT EXISTS FOR (c:CaseStudy) REQUIRE c.pgId IS UNIQUE',
      'CREATE CONSTRAINT studygroup_pgid IF NOT EXISTS FOR (s:StudyGroup) REQUIRE s.pgId IS UNIQUE',
      'CREATE CONSTRAINT researchproject_pgid IF NOT EXISTS FOR (r:ResearchProject) REQUIRE r.pgId IS UNIQUE',
      'CREATE CONSTRAINT topic_pgid IF NOT EXISTS FOR (t:Topic) REQUIRE t.pgId IS UNIQUE',
      // Career & Mentorship nodes
      'CREATE CONSTRAINT certification_pgid IF NOT EXISTS FOR (c:Certification) REQUIRE c.pgId IS UNIQUE',
      'CREATE CONSTRAINT careerpath_pgid IF NOT EXISTS FOR (c:CareerPath) REQUIRE c.pgId IS UNIQUE',
      'CREATE CONSTRAINT careermilestone_pgid IF NOT EXISTS FOR (m:CareerMilestone) REQUIRE m.pgId IS UNIQUE',
      'CREATE CONSTRAINT mentorship_pgid IF NOT EXISTS FOR (m:Mentorship) REQUIRE m.pgId IS UNIQUE',
      // Events & Courses nodes
      'CREATE CONSTRAINT event_pgid IF NOT EXISTS FOR (e:Event) REQUIRE e.pgId IS UNIQUE',
      'CREATE CONSTRAINT course_pgid IF NOT EXISTS FOR (c:Course) REQUIRE c.pgId IS UNIQUE',
    ];

    for (const constraint of constraints) {
      try {
        await this.neo4j.write(constraint);
      } catch (error) {
        this.logger.debug(`Constraint skipped: ${error.message}`);
      }
    }
    this.logger.log(`Neo4j constraints ensured (${constraints.length})`);
  }

  private async createIndexes() {
    const indexes = [
      // Doctor indexes
      'CREATE INDEX doctor_fullname IF NOT EXISTS FOR (d:Doctor) ON (d.fullName)',
      'CREATE INDEX doctor_crm IF NOT EXISTS FOR (d:Doctor) ON (d.crm, d.crmState)',
      'CREATE INDEX doctor_city_state IF NOT EXISTS FOR (d:Doctor) ON (d.city, d.state)',
      'CREATE INDEX doctor_graduation IF NOT EXISTS FOR (d:Doctor) ON (d.graduationYear)',
      // Institution indexes
      'CREATE INDEX institution_name IF NOT EXISTS FOR (i:Institution) ON (i.name)',
      'CREATE INDEX institution_city_state IF NOT EXISTS FOR (i:Institution) ON (i.city, i.state)',
      'CREATE INDEX institution_type IF NOT EXISTS FOR (i:Institution) ON (i.type)',
      // Job indexes
      'CREATE INDEX job_active IF NOT EXISTS FOR (j:Job) ON (j.isActive)',
      'CREATE INDEX job_city IF NOT EXISTS FOR (j:Job) ON (j.city)',
      'CREATE INDEX job_type_shift IF NOT EXISTS FOR (j:Job) ON (j.type, j.shift)',
      // Specialty & Skill indexes
      'CREATE INDEX specialty_name IF NOT EXISTS FOR (s:Specialty) ON (s.name)',
      'CREATE INDEX skill_name IF NOT EXISTS FOR (s:Skill) ON (s.name)',
      // Collaboration indexes
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
      // GDS algorithm result indexes — allow fast ORDER BY on computed scores
      'CREATE INDEX doctor_pagerank IF NOT EXISTS FOR (d:Doctor) ON (d.pageRank)',
      'CREATE INDEX doctor_betweenness IF NOT EXISTS FOR (d:Doctor) ON (d.betweenness)',
      'CREATE INDEX doctor_community IF NOT EXISTS FOR (d:Doctor) ON (d.communityId)',
      // Events & Courses indexes
      'CREATE INDEX event_type IF NOT EXISTS FOR (e:Event) ON (e.eventType)',
      'CREATE INDEX event_status IF NOT EXISTS FOR (e:Event) ON (e.status)',
      'CREATE INDEX event_startdate IF NOT EXISTS FOR (e:Event) ON (e.startDate)',
      'CREATE INDEX course_status IF NOT EXISTS FOR (c:Course) ON (c.status)',
      'CREATE INDEX topic_name IF NOT EXISTS FOR (t:Topic) ON (t.name)',
    ];

    for (const index of indexes) {
      try {
        await this.neo4j.write(index);
      } catch (error) {
        this.logger.debug(`Index skipped: ${error.message}`);
      }
    }
    this.logger.log(`Neo4j indexes ensured (${indexes.length})`);
  }

  /**
   * Full-text indexes enable fuzzy/tokenized search across text properties.
   * These power the agentic search's natural language queries.
   */
  private async createFullTextIndexes() {
    const fullTextIndexes = [
      // Search doctors by name (supports fuzzy matching, accents, partial)
      `CREATE FULLTEXT INDEX doctor_fulltext IF NOT EXISTS
       FOR (d:Doctor) ON EACH [d.fullName]`,
      // Search institutions by name
      `CREATE FULLTEXT INDEX institution_fulltext IF NOT EXISTS
       FOR (i:Institution) ON EACH [i.name]`,
      // Search publications by title
      `CREATE FULLTEXT INDEX publication_fulltext IF NOT EXISTS
       FOR (p:Publication) ON EACH [p.title]`,
      // Search jobs by title
      `CREATE FULLTEXT INDEX job_fulltext IF NOT EXISTS
       FOR (j:Job) ON EACH [j.title]`,
      // Search case studies by title
      `CREATE FULLTEXT INDEX casestudy_fulltext IF NOT EXISTS
       FOR (c:CaseStudy) ON EACH [c.title]`,
      // Search study groups by name and description
      `CREATE FULLTEXT INDEX studygroup_fulltext IF NOT EXISTS
       FOR (s:StudyGroup) ON EACH [s.name, s.description]`,
      // Search research projects by title and description
      `CREATE FULLTEXT INDEX researchproject_fulltext IF NOT EXISTS
       FOR (r:ResearchProject) ON EACH [r.title, r.description]`,
      // Search events by title
      `CREATE FULLTEXT INDEX event_fulltext IF NOT EXISTS
       FOR (e:Event) ON EACH [e.title]`,
      // Search courses by title and description
      `CREATE FULLTEXT INDEX course_fulltext IF NOT EXISTS
       FOR (c:Course) ON EACH [c.title, c.description]`,
      // Search skills by name
      `CREATE FULLTEXT INDEX skill_fulltext IF NOT EXISTS
       FOR (s:Skill) ON EACH [s.name]`,
    ];

    for (const ftIndex of fullTextIndexes) {
      try {
        await this.neo4j.write(ftIndex);
      } catch (error) {
        this.logger.debug(`Full-text index skipped: ${error.message}`);
      }
    }
    this.logger.log(`Neo4j full-text indexes ensured (${fullTextIndexes.length})`);
  }

  /**
   * Verify that the GDS plugin is available.
   * Log a warning if not — GDS features (PageRank, etc.) will be disabled.
   */
  private async verifyGdsPlugin() {
    try {
      const results = await this.neo4j.read<{ name: string }>(
        `CALL gds.list() YIELD name RETURN name LIMIT 1`,
      );
      if (results.length > 0) {
        this.logger.log('Neo4j GDS plugin available');
      }
    } catch {
      this.logger.warn(
        'Neo4j GDS plugin not available — PageRank, Community Detection, and Similarity algorithms will be disabled. ' +
        'Install the graph-data-science plugin to enable these features.',
      );
    }
  }
}
