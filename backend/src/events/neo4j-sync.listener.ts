import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Neo4jService } from '../database/neo4j/neo4j.service';
import { EVENTS } from './events.constants';

/**
 * Synchronizes PostgreSQL events to Neo4j graph nodes and relationships.
 * Uses MERGE for idempotency — safe to replay events.
 */
@Injectable()
export class Neo4jSyncListener {
  private readonly logger = new Logger(Neo4jSyncListener.name);

  constructor(private readonly neo4j: Neo4jService) {}

  // ════════════════════════════════════════════════════════════════
  // DOCTOR
  // ════════════════════════════════════════════════════════════════

  @OnEvent(EVENTS.DOCTOR_CREATED)
  async handleDoctorCreated(payload: {
    id: string;
    fullName: string;
    crm: string;
    crmState: string;
    profilePicUrl?: string;
    city?: string;
    state?: string;
    graduationYear?: number;
  }) {
    await this.syncSafe('Doctor created', () =>
      this.neo4j.write(
        `MERGE (d:Doctor {pgId: $id})
         ON CREATE SET d.fullName = $fullName, d.crm = $crm, d.crmState = $crmState,
                       d.profilePicUrl = $profilePicUrl, d.city = $city, d.state = $state,
                       d.graduationYear = $graduationYear
         ON MATCH SET  d.fullName = $fullName, d.crm = $crm, d.crmState = $crmState,
                       d.profilePicUrl = $profilePicUrl, d.city = $city, d.state = $state,
                       d.graduationYear = $graduationYear`,
        {
          id: payload.id,
          fullName: payload.fullName,
          crm: payload.crm,
          crmState: payload.crmState,
          profilePicUrl: payload.profilePicUrl || null,
          city: payload.city || null,
          state: payload.state || null,
          graduationYear: payload.graduationYear || null,
        },
      ),
    );
  }

  @OnEvent(EVENTS.DOCTOR_UPDATED)
  async handleDoctorUpdated(payload: {
    id: string;
    fullName?: string;
    profilePicUrl?: string;
    city?: string;
    state?: string;
    graduationYear?: number;
  }) {
    const setEntries: string[] = [];
    const params: Record<string, any> = { id: payload.id };

    if (payload.fullName !== undefined) {
      setEntries.push('d.fullName = $fullName');
      params.fullName = payload.fullName;
    }
    if (payload.profilePicUrl !== undefined) {
      setEntries.push('d.profilePicUrl = $profilePicUrl');
      params.profilePicUrl = payload.profilePicUrl;
    }
    if (payload.city !== undefined) {
      setEntries.push('d.city = $city');
      params.city = payload.city;
    }
    if (payload.state !== undefined) {
      setEntries.push('d.state = $state');
      params.state = payload.state;
    }
    if (payload.graduationYear !== undefined) {
      setEntries.push('d.graduationYear = $graduationYear');
      params.graduationYear = payload.graduationYear;
    }

    if (setEntries.length === 0) return;

    await this.syncSafe('Doctor updated', () =>
      this.neo4j.write(
        `MATCH (d:Doctor {pgId: $id}) SET ${setEntries.join(', ')}`,
        params,
      ),
    );
  }

  @OnEvent(EVENTS.DOCTOR_DELETED)
  async handleDoctorDeleted(payload: { id: string }) {
    await this.syncSafe('Doctor deleted', () =>
      this.neo4j.write(
        `MATCH (d:Doctor {pgId: $id}) DETACH DELETE d`,
        { id: payload.id },
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // SPECIALTY & SKILL
  // ════════════════════════════════════════════════════════════════

  @OnEvent(EVENTS.SPECIALTY_ADDED)
  async handleSpecialtyAdded(payload: {
    doctorId: string;
    specialtyId: string;
    specialtyName: string;
    isPrimary?: boolean;
  }) {
    await this.syncSafe('Specialty added', () =>
      this.neo4j.write(
        `MATCH (d:Doctor {pgId: $doctorId})
         MERGE (s:Specialty {pgId: $specialtyId})
           ON CREATE SET s.name = $specialtyName
         MERGE (d)-[r:SPECIALIZES_IN]->(s)
           ON CREATE SET r.isPrimary = $isPrimary`,
        {
          doctorId: payload.doctorId,
          specialtyId: payload.specialtyId,
          specialtyName: payload.specialtyName,
          isPrimary: payload.isPrimary || false,
        },
      ),
    );
  }

  @OnEvent(EVENTS.SPECIALTY_REMOVED)
  async handleSpecialtyRemoved(payload: { doctorId: string; specialtyId: string }) {
    await this.syncSafe('Specialty removed', () =>
      this.neo4j.write(
        `MATCH (d:Doctor {pgId: $doctorId})-[r:SPECIALIZES_IN]->(s:Specialty {pgId: $specialtyId})
         DELETE r`,
        payload,
      ),
    );
  }

  @OnEvent(EVENTS.SKILL_ADDED)
  async handleSkillAdded(payload: {
    doctorId: string;
    skillId: string;
    skillName: string;
  }) {
    await this.syncSafe('Skill added', () =>
      this.neo4j.write(
        `MATCH (d:Doctor {pgId: $doctorId})
         MERGE (s:Skill {pgId: $skillId})
           ON CREATE SET s.name = $skillName
         MERGE (d)-[:HAS_SKILL]->(s)`,
        payload,
      ),
    );
  }

  @OnEvent(EVENTS.SKILL_REMOVED)
  async handleSkillRemoved(payload: { doctorId: string; skillId: string }) {
    await this.syncSafe('Skill removed', () =>
      this.neo4j.write(
        `MATCH (d:Doctor {pgId: $doctorId})-[r:HAS_SKILL]->(s:Skill {pgId: $skillId})
         DELETE r`,
        payload,
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // INSTITUTION
  // ════════════════════════════════════════════════════════════════

  @OnEvent(EVENTS.INSTITUTION_CREATED)
  async handleInstitutionCreated(payload: {
    id: string;
    name: string;
    type: string;
    city: string;
    state: string;
  }) {
    await this.syncSafe('Institution created', () =>
      this.neo4j.write(
        `MERGE (i:Institution {pgId: $id})
         ON CREATE SET i.name = $name, i.type = $type, i.city = $city, i.state = $state
         ON MATCH SET  i.name = $name, i.type = $type, i.city = $city, i.state = $state`,
        payload,
      ),
    );
  }

  @OnEvent(EVENTS.INSTITUTION_UPDATED)
  async handleInstitutionUpdated(payload: {
    id: string;
    name?: string;
    type?: string;
    city?: string;
    state?: string;
  }) {
    const setEntries: string[] = [];
    const params: Record<string, any> = { id: payload.id };

    if (payload.name !== undefined) { setEntries.push('i.name = $name'); params.name = payload.name; }
    if (payload.type !== undefined) { setEntries.push('i.type = $type'); params.type = payload.type; }
    if (payload.city !== undefined) { setEntries.push('i.city = $city'); params.city = payload.city; }
    if (payload.state !== undefined) { setEntries.push('i.state = $state'); params.state = payload.state; }

    if (setEntries.length === 0) return;

    await this.syncSafe('Institution updated', () =>
      this.neo4j.write(
        `MATCH (i:Institution {pgId: $id}) SET ${setEntries.join(', ')}`,
        params,
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // WORKPLACE
  // ════════════════════════════════════════════════════════════════

  @OnEvent(EVENTS.WORKPLACE_CREATED)
  async handleWorkplaceCreated(payload: {
    doctorId: string;
    institutionId: string;
    role?: string;
  }) {
    await this.syncSafe('Workplace created', () =>
      this.neo4j.write(
        `MATCH (d:Doctor {pgId: $doctorId})
         MATCH (i:Institution {pgId: $institutionId})
         MERGE (d)-[w:WORKS_AT]->(i)
           ON CREATE SET w.since = datetime(), w.role = $role`,
        { ...payload, role: payload.role || null },
      ),
    );
  }

  @OnEvent(EVENTS.WORKPLACE_REMOVED)
  async handleWorkplaceRemoved(payload: { doctorId: string; institutionId: string }) {
    await this.syncSafe('Workplace removed', () =>
      this.neo4j.write(
        `MATCH (d:Doctor {pgId: $doctorId})-[r:WORKS_AT]->(i:Institution {pgId: $institutionId})
         DELETE r`,
        payload,
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // JOB
  // ════════════════════════════════════════════════════════════════

  @OnEvent(EVENTS.JOB_CREATED)
  async handleJobCreated(payload: {
    id: string;
    title: string;
    type: string;
    city: string;
    shift: string;
    institutionId: string;
    specialtyId?: string;
  }) {
    await this.syncSafe('Job created', () =>
      this.neo4j.writeTransaction([
        {
          cypher: `MATCH (i:Institution {pgId: $institutionId})
                   MERGE (j:Job {pgId: $id})
                     ON CREATE SET j.title = $title, j.type = $type, j.city = $city,
                                   j.shift = $shift, j.isActive = true
                   MERGE (i)-[:POSTED]->(j)`,
          params: payload,
        },
        ...(payload.specialtyId
          ? [{
              cypher: `MATCH (j:Job {pgId: $jobId})
                       MATCH (s:Specialty {pgId: $specialtyId})
                       MERGE (j)-[:REQUIRES_SPECIALTY]->(s)`,
              params: { jobId: payload.id, specialtyId: payload.specialtyId },
            }]
          : []),
      ]),
    );
  }

  @OnEvent(EVENTS.JOB_DEACTIVATED)
  async handleJobDeactivated(payload: { id: string }) {
    await this.syncSafe('Job deactivated', () =>
      this.neo4j.write(
        `MATCH (j:Job {pgId: $id}) SET j.isActive = false`,
        { id: payload.id },
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // PUBLICATIONS & COLLABORATION
  // ════════════════════════════════════════════════════════════════

  @OnEvent(EVENTS.PUBLICATION_CREATED)
  async handlePublicationCreated(payload: {
    id: string;
    title: string;
    journal?: string;
    publicationType?: string;
    specialtyId?: string;
  }) {
    await this.syncSafe('Publication created', () =>
      this.neo4j.writeTransaction([
        {
          cypher: `MERGE (p:Publication {pgId: $id})
                   ON CREATE SET p.title = $title, p.journal = $journal,
                                 p.publicationType = $publicationType`,
          params: {
            id: payload.id,
            title: payload.title,
            journal: payload.journal || null,
            publicationType: payload.publicationType || null,
          },
        },
        ...(payload.specialtyId
          ? [{
              cypher: `MATCH (p:Publication {pgId: $pubId})
                       MATCH (s:Specialty {pgId: $specialtyId})
                       MERGE (p)-[:RELATES_TO]->(s)`,
              params: { pubId: payload.id, specialtyId: payload.specialtyId },
            }]
          : []),
      ]),
    );
  }

  @OnEvent(EVENTS.PUBLICATION_AUTHOR_ADDED)
  async handlePublicationAuthorAdded(payload: {
    publicationId: string;
    doctorId: string;
    role?: string;
    authorOrder?: number;
  }) {
    await this.syncSafe('Publication author added', () =>
      this.neo4j.write(
        `MATCH (d:Doctor {pgId: $doctorId})
         MATCH (p:Publication {pgId: $publicationId})
         MERGE (d)-[r:AUTHORED]->(p)
           ON CREATE SET r.role = $role, r.authorOrder = $authorOrder`,
        {
          doctorId: payload.doctorId,
          publicationId: payload.publicationId,
          role: payload.role || 'AUTHOR',
          authorOrder: payload.authorOrder || null,
        },
      ),
    );
  }

  @OnEvent(EVENTS.CASE_STUDY_CREATED)
  async handleCaseStudyCreated(payload: {
    id: string;
    title: string;
    authorId: string;
    specialtyId?: string;
    status?: string;
  }) {
    await this.syncSafe('CaseStudy created', () =>
      this.neo4j.writeTransaction([
        {
          cypher: `MERGE (cs:CaseStudy {pgId: $id})
                   ON CREATE SET cs.title = $title, cs.status = $status`,
          params: { id: payload.id, title: payload.title, status: payload.status || 'OPEN' },
        },
        {
          cypher: `MATCH (d:Doctor {pgId: $authorId})
                   MATCH (cs:CaseStudy {pgId: $caseId})
                   MERGE (d)-[:AUTHORED]->(cs)`,
          params: { authorId: payload.authorId, caseId: payload.id },
        },
        ...(payload.specialtyId
          ? [{
              cypher: `MATCH (cs:CaseStudy {pgId: $caseId})
                       MATCH (s:Specialty {pgId: $specialtyId})
                       MERGE (cs)-[:RELATES_TO]->(s)`,
              params: { caseId: payload.id, specialtyId: payload.specialtyId },
            }]
          : []),
      ]),
    );
  }

  @OnEvent(EVENTS.CASE_STUDY_PARTICIPANT_ADDED)
  async handleCaseStudyParticipantAdded(payload: { caseStudyId: string; doctorId: string }) {
    await this.syncSafe('CaseStudy participant added', () =>
      this.neo4j.write(
        `MATCH (d:Doctor {pgId: $doctorId})
         MATCH (cs:CaseStudy {pgId: $caseStudyId})
         MERGE (d)-[:PARTICIPATED_IN]->(cs)`,
        payload,
      ),
    );
  }

  @OnEvent(EVENTS.STUDY_GROUP_CREATED)
  async handleStudyGroupCreated(payload: {
    id: string;
    name: string;
    specialtyId?: string;
    isPublic?: boolean;
    description?: string;
  }) {
    await this.syncSafe('StudyGroup created', () =>
      this.neo4j.writeTransaction([
        {
          cypher: `MERGE (sg:StudyGroup {pgId: $id})
                   ON CREATE SET sg.name = $name, sg.isPublic = $isPublic, sg.description = $description`,
          params: {
            id: payload.id,
            name: payload.name,
            isPublic: payload.isPublic ?? true,
            description: payload.description || null,
          },
        },
        ...(payload.specialtyId
          ? [{
              cypher: `MATCH (sg:StudyGroup {pgId: $groupId})
                       MATCH (s:Specialty {pgId: $specialtyId})
                       MERGE (sg)-[:FOCUSES_ON]->(s)`,
              params: { groupId: payload.id, specialtyId: payload.specialtyId },
            }]
          : []),
      ]),
    );
  }

  @OnEvent(EVENTS.STUDY_GROUP_MEMBER_ADDED)
  async handleStudyGroupMemberAdded(payload: { studyGroupId: string; doctorId: string; role?: string }) {
    await this.syncSafe('StudyGroup member added', () =>
      this.neo4j.write(
        `MATCH (d:Doctor {pgId: $doctorId})
         MATCH (sg:StudyGroup {pgId: $studyGroupId})
         MERGE (d)-[r:MEMBER_OF]->(sg)
           ON CREATE SET r.role = $role`,
        { ...payload, role: payload.role || 'MEMBER' },
      ),
    );
  }

  @OnEvent(EVENTS.STUDY_GROUP_MEMBER_REMOVED)
  async handleStudyGroupMemberRemoved(payload: { studyGroupId: string; doctorId: string }) {
    await this.syncSafe('StudyGroup member removed', () =>
      this.neo4j.write(
        `MATCH (d:Doctor {pgId: $doctorId})-[r:MEMBER_OF]->(sg:StudyGroup {pgId: $studyGroupId})
         DELETE r`,
        payload,
      ),
    );
  }

  @OnEvent(EVENTS.RESEARCH_PROJECT_CREATED)
  async handleResearchProjectCreated(payload: {
    id: string;
    title: string;
    description?: string;
    status?: string;
  }) {
    await this.syncSafe('ResearchProject created', () =>
      this.neo4j.write(
        `MERGE (rp:ResearchProject {pgId: $id})
         ON CREATE SET rp.title = $title, rp.description = $description, rp.status = $status`,
        {
          id: payload.id,
          title: payload.title,
          description: payload.description || null,
          status: payload.status || 'PLANNING',
        },
      ),
    );
  }

  @OnEvent(EVENTS.RESEARCH_PROJECT_MEMBER_ADDED)
  async handleResearchProjectMemberAdded(payload: {
    researchProjectId: string;
    doctorId: string;
    role?: string;
  }) {
    await this.syncSafe('ResearchProject member added', () =>
      this.neo4j.write(
        `MATCH (d:Doctor {pgId: $doctorId})
         MATCH (rp:ResearchProject {pgId: $researchProjectId})
         MERGE (d)-[r:COLLABORATES_ON]->(rp)
           ON CREATE SET r.role = $role`,
        { ...payload, role: payload.role || 'COLLABORATOR' },
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // CAREER & MENTORSHIP
  // ════════════════════════════════════════════════════════════════

  @OnEvent(EVENTS.MENTORSHIP_CREATED)
  async handleMentorshipCreated(payload: {
    id: string;
    mentorId: string;
    menteeId: string;
    focusArea?: string;
  }) {
    await this.syncSafe('Mentorship created', () =>
      this.neo4j.write(
        `MATCH (mentor:Doctor {pgId: $mentorId})
         MATCH (mentee:Doctor {pgId: $menteeId})
         MERGE (mentee)-[m:MENTORS]->(mentor)
           ON CREATE SET m.pgId = $id, m.status = 'ACTIVE', m.startDate = datetime(),
                         m.focusArea = $focusArea`,
        {
          id: payload.id,
          mentorId: payload.mentorId,
          menteeId: payload.menteeId,
          focusArea: payload.focusArea || null,
        },
      ),
    );
  }

  @OnEvent(EVENTS.MENTORSHIP_ENDED)
  async handleMentorshipEnded(payload: { mentorId: string; menteeId: string }) {
    await this.syncSafe('Mentorship ended', () =>
      this.neo4j.write(
        `MATCH (mentee:Doctor {pgId: $menteeId})-[m:MENTORS]->(mentor:Doctor {pgId: $mentorId})
         SET m.status = 'ENDED', m.endDate = datetime()`,
        payload,
      ),
    );
  }

  @OnEvent(EVENTS.CERTIFICATION_AWARDED)
  async handleCertificationAwarded(payload: {
    doctorId: string;
    certificationId: string;
    certificationName: string;
    certificationType?: string;
    issuingBody?: string;
  }) {
    await this.syncSafe('Certification awarded', () =>
      this.neo4j.write(
        `MATCH (d:Doctor {pgId: $doctorId})
         MERGE (c:Certification {pgId: $certificationId})
           ON CREATE SET c.name = $certificationName, c.certificationType = $certificationType,
                         c.issuingBody = $issuingBody
         MERGE (d)-[:HOLDS_CERTIFICATION]->(c)`,
        {
          doctorId: payload.doctorId,
          certificationId: payload.certificationId,
          certificationName: payload.certificationName,
          certificationType: payload.certificationType || null,
          issuingBody: payload.issuingBody || null,
        },
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // EVENTS & COURSES
  // ════════════════════════════════════════════════════════════════

  @OnEvent(EVENTS.EVENT_CREATED)
  async handleEventCreated(payload: {
    id: string;
    title: string;
    eventType: string;
    startDate?: string;
    location?: string;
    isOnline?: boolean;
  }) {
    await this.syncSafe('Event created', () =>
      this.neo4j.write(
        `MERGE (e:Event {pgId: $id})
         ON CREATE SET e.title = $title, e.eventType = $eventType,
                       e.startDate = $startDate, e.location = $location, e.isOnline = $isOnline`,
        {
          id: payload.id,
          title: payload.title,
          eventType: payload.eventType,
          startDate: payload.startDate || null,
          location: payload.location || null,
          isOnline: payload.isOnline ?? false,
        },
      ),
    );
  }

  @OnEvent(EVENTS.EVENT_SPEAKER_ADDED)
  async handleEventSpeakerAdded(payload: {
    eventId: string;
    doctorId: string;
    topic?: string;
  }) {
    await this.syncSafe('Event speaker added', () =>
      this.neo4j.write(
        `MATCH (d:Doctor {pgId: $doctorId})
         MATCH (e:Event {pgId: $eventId})
         MERGE (d)-[r:SPEAKS_AT]->(e)
           ON CREATE SET r.topic = $topic`,
        { ...payload, topic: payload.topic || null },
      ),
    );
  }

  @OnEvent(EVENTS.COURSE_CREATED)
  async handleCourseCreated(payload: {
    id: string;
    title: string;
    description?: string;
    level?: string;
    instructorId?: string;
  }) {
    await this.syncSafe('Course created', () =>
      this.neo4j.writeTransaction([
        {
          cypher: `MERGE (c:Course {pgId: $id})
                   ON CREATE SET c.title = $title, c.description = $description,
                                 c.level = $level, c.status = 'PUBLISHED'`,
          params: {
            id: payload.id,
            title: payload.title,
            description: payload.description || null,
            level: payload.level || null,
          },
        },
        ...(payload.instructorId
          ? [{
              cypher: `MATCH (d:Doctor {pgId: $instructorId})
                       MATCH (c:Course {pgId: $courseId})
                       MERGE (d)-[:TEACHES]->(c)`,
              params: { instructorId: payload.instructorId, courseId: payload.id },
            }]
          : []),
      ]),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // HELPER
  // ════════════════════════════════════════════════════════════════

  private async syncSafe(label: string, operation: () => Promise<any>): Promise<void> {
    try {
      await operation();
      this.logger.log(`Neo4j sync: ${label}`);
    } catch (error) {
      this.logger.error(
        `Neo4j sync FAILED: ${label} — ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
