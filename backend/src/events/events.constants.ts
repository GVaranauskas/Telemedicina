export const EVENTS = {
  // Doctor lifecycle
  DOCTOR_CREATED: 'doctor.created',
  DOCTOR_UPDATED: 'doctor.updated',
  DOCTOR_DELETED: 'doctor.deleted',

  // Institution lifecycle
  INSTITUTION_CREATED: 'institution.created',
  INSTITUTION_UPDATED: 'institution.updated',

  // Job lifecycle
  JOB_CREATED: 'job.created',
  JOB_UPDATED: 'job.updated',
  JOB_DEACTIVATED: 'job.deactivated',

  // Connections & social
  CONNECTION_CREATED: 'connection.created',
  CONNECTION_REMOVED: 'connection.removed',

  // Specialty & Skills
  SPECIALTY_ADDED: 'doctor.specialty.added',
  SPECIALTY_REMOVED: 'doctor.specialty.removed',
  SKILL_ADDED: 'doctor.skill.added',
  SKILL_REMOVED: 'doctor.skill.removed',

  // Workplace
  WORKPLACE_CREATED: 'workplace.created',
  WORKPLACE_REMOVED: 'workplace.removed',

  // Posts & Social
  POST_CREATED: 'post.created',
  POST_LIKED: 'post.liked',
  POST_COMMENTED: 'post.commented',

  // Appointments
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',

  // Publications & Collaboration
  PUBLICATION_CREATED: 'publication.created',
  PUBLICATION_AUTHOR_ADDED: 'publication.author.added',
  CASE_STUDY_CREATED: 'casestudy.created',
  CASE_STUDY_PARTICIPANT_ADDED: 'casestudy.participant.added',
  STUDY_GROUP_CREATED: 'studygroup.created',
  STUDY_GROUP_MEMBER_ADDED: 'studygroup.member.added',
  STUDY_GROUP_MEMBER_REMOVED: 'studygroup.member.removed',
  RESEARCH_PROJECT_CREATED: 'researchproject.created',
  RESEARCH_PROJECT_MEMBER_ADDED: 'researchproject.member.added',

  // Career & Mentorship
  MENTORSHIP_CREATED: 'mentorship.created',
  MENTORSHIP_ENDED: 'mentorship.ended',
  CERTIFICATION_AWARDED: 'certification.awarded',

  // Events & Courses
  EVENT_CREATED: 'event.created',
  EVENT_ATTENDEE_ADDED: 'event.attendee.added',
  EVENT_SPEAKER_ADDED: 'event.speaker.added',
  COURSE_CREATED: 'course.created',
  COURSE_ENROLLMENT_CREATED: 'course.enrollment.created',
};
