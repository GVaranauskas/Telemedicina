import { LLMTool } from '../llm/llm-adapter.interface';

export const cypherQueryTool: LLMTool = {
  name: 'execute_cypher',
  description:
    'Execute a Cypher query against the Neo4j graph database to search for doctors, institutions, specialties, skills, jobs, connections, collaborations, and relationships. This is the most powerful tool — use it for complex graph traversals and analytics.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'The Cypher query to execute. Use MATCH, WHERE, RETURN patterns. Available labels: Doctor, Institution, Specialty, Skill, Job, City, State, Publication, CaseStudy, StudyGroup, ResearchProject. Available relationships: CONNECTED_TO, FOLLOWS, WORKS_AT, SPECIALIZES_IN, HAS_SKILL, ENDORSED, APPLIED_TO, POSTED, REQUIRES_SPECIALTY, LOCATED_IN, IN_STATE, AUTHORED, MEMBER_OF, COLLABORATES_ON, PARTICIPATED_IN, CITES, RELATES_TO, FOCUSES_ON.',
      },
      params: {
        type: 'object',
        description:
          'Parameters to pass to the query (e.g., {name: "Cardiologia"}). Always use parameters instead of string concatenation.',
        additionalProperties: true,
      },
    },
    required: ['query'],
  },
};

export const doctorLookupTool: LLMTool = {
  name: 'lookup_doctor_details',
  description:
    'Get full details of a specific doctor from PostgreSQL by their ID. Returns profile, specialties, skills, work experiences, publications, and study groups.',
  parameters: {
    type: 'object',
    properties: {
      doctorId: {
        type: 'string',
        description: 'The PostgreSQL ID of the doctor',
      },
    },
    required: ['doctorId'],
  },
};

export const jobSearchTool: LLMTool = {
  name: 'search_jobs',
  description:
    'Search for job listings with filters. Returns active job postings from PostgreSQL with institution details.',
  parameters: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['PLANTAO', 'CONSULTA'],
        description: 'Job type: PLANTAO (shift work) or CONSULTA (consultation)',
      },
      shift: {
        type: 'string',
        enum: ['DIURNO', 'NOTURNO', 'INTEGRAL', 'FLEXIVEL'],
        description: 'Work shift preference',
      },
      city: {
        type: 'string',
        description: 'City name (e.g., Sao Paulo)',
      },
      state: {
        type: 'string',
        description: 'State code (e.g., SP)',
      },
      specialtyId: {
        type: 'string',
        description: 'Filter by specialty ID',
      },
    },
  },
};

export const institutionSearchTool: LLMTool = {
  name: 'search_institutions',
  description:
    'Search for health institutions (hospitals, clinics, UBS, labs, etc.) with filters.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Institution name or partial name',
      },
      type: {
        type: 'string',
        enum: ['HOSPITAL', 'CLINICA', 'UBS', 'LABORATORIO', 'PRONTO_SOCORRO', 'CONSULTORIO'],
        description: 'Institution type',
      },
      city: {
        type: 'string',
        description: 'City name',
      },
      state: {
        type: 'string',
        description: 'State code',
      },
    },
  },
};

export const connectionPathTool: LLMTool = {
  name: 'find_connection_path',
  description:
    'Find the shortest connection path between two doctors in the graph. Shows how they are connected through mutual connections (up to 6 hops).',
  parameters: {
    type: 'object',
    properties: {
      fromDoctorId: {
        type: 'string',
        description: 'Start doctor ID (pgId)',
      },
      toDoctorId: {
        type: 'string',
        description: 'Target doctor ID (pgId)',
      },
    },
    required: ['fromDoctorId', 'toDoctorId'],
  },
};

export const findDoctorsBySkillTool: LLMTool = {
  name: 'find_doctors_by_skill',
  description:
    'Find doctors who have a specific skill or can perform a specific medical procedure. Optionally filter by city. Returns doctors with matching skill and their endorsement count.',
  parameters: {
    type: 'object',
    properties: {
      skillName: {
        type: 'string',
        description: 'The skill or procedure name (e.g., "Ecocardiograma", "Intubacao Orotraqueal", "ACLS")',
      },
      city: {
        type: 'string',
        description: 'Optional city filter (e.g., "Sao Paulo")',
      },
      limit: {
        type: 'number',
        description: 'Max results to return (default: 10)',
      },
    },
    required: ['skillName'],
  },
};

export const doctorNetworkStatsTool: LLMTool = {
  name: 'get_doctor_network_stats',
  description:
    'Get comprehensive network statistics for a doctor: total connections, followers, skills, endorsements received, institutions worked at, publications, and study groups.',
  parameters: {
    type: 'object',
    properties: {
      doctorId: {
        type: 'string',
        description: 'The doctor pgId to get stats for',
      },
    },
    required: ['doctorId'],
  },
};

export const findCommonGroundTool: LLMTool = {
  name: 'find_common_ground',
  description:
    'Find what two doctors have in common: shared specialties, shared skills, shared institutions, shared publications, and mutual connections.',
  parameters: {
    type: 'object',
    properties: {
      doctorId1: {
        type: 'string',
        description: 'First doctor pgId',
      },
      doctorId2: {
        type: 'string',
        description: 'Second doctor pgId',
      },
    },
    required: ['doctorId1', 'doctorId2'],
  },
};

export const institutionStaffTool: LLMTool = {
  name: 'get_institution_staff',
  description:
    'List all doctors who work at a specific institution, including their roles and specialties.',
  parameters: {
    type: 'object',
    properties: {
      institutionName: {
        type: 'string',
        description: 'Institution name or partial name to search for',
      },
      institutionId: {
        type: 'string',
        description: 'Institution pgId (if known)',
      },
    },
  },
};

// ============================================================================
// COLLABORATION TOOLS - New for Phase 1
// ============================================================================

export const findPublicationsTool: LLMTool = {
  name: 'find_publications',
  description:
    'Search for scientific publications in the graph. Can filter by specialty, keyword in title, or author. Returns publication details with authors.',
  parameters: {
    type: 'object',
    properties: {
      specialty: {
        type: 'string',
        description: 'Filter by medical specialty (e.g., "Cardiologia")',
      },
      keyword: {
        type: 'string',
        description: 'Keyword to search in title or abstract',
      },
      authorId: {
        type: 'string',
        description: 'Filter by author doctor pgId',
      },
      limit: {
        type: 'number',
        description: 'Max results (default: 10)',
      },
    },
  },
};

export const findCoauthorsTool: LLMTool = {
  name: 'find_coauthors',
  description:
    'Find doctors who have co-authored publications with a specific doctor. Shows collaboration network in research.',
  parameters: {
    type: 'object',
    properties: {
      doctorId: {
        type: 'string',
        description: 'The doctor pgId to find co-authors for',
      },
      limit: {
        type: 'number',
        description: 'Max results (default: 10)',
      },
    },
    required: ['doctorId'],
  },
};

export const findStudyGroupsTool: LLMTool = {
  name: 'find_study_groups',
  description:
    'Search for study groups available in the platform. Can filter by specialty or find public groups the doctor can join.',
  parameters: {
    type: 'object',
    properties: {
      specialty: {
        type: 'string',
        description: 'Filter by medical specialty',
      },
      doctorId: {
        type: 'string',
        description: 'Doctor pgId - to find groups they can join (not already member)',
      },
      isPublic: {
        type: 'boolean',
        description: 'Filter by public/private status',
      },
      limit: {
        type: 'number',
        description: 'Max results (default: 10)',
      },
    },
  },
};

export const findCaseStudiesTool: LLMTool = {
  name: 'find_case_studies',
  description:
    'Search for clinical case studies in the platform. Can filter by specialty, status (OPEN, DISCUSSION, RESOLVED), or find cases the doctor can participate in.',
  parameters: {
    type: 'object',
    properties: {
      specialty: {
        type: 'string',
        description: 'Filter by medical specialty',
      },
      status: {
        type: 'string',
        enum: ['OPEN', 'DISCUSSION', 'RESOLVED', 'CLOSED'],
        description: 'Filter by case status',
      },
      doctorId: {
        type: 'string',
        description: 'Doctor pgId - to find cases they can participate in',
      },
      limit: {
        type: 'number',
        description: 'Max results (default: 10)',
      },
    },
  },
};

export const findResearchProjectsTool: LLMTool = {
  name: 'find_research_projects',
  description:
    'Search for active research projects looking for collaborators. Can filter by status or find projects the doctor could join.',
  parameters: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['PLANNING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
        description: 'Filter by project status',
      },
      doctorId: {
        type: 'string',
        description: 'Doctor pgId - to find projects in their specialty area',
      },
      limit: {
        type: 'number',
        description: 'Max results (default: 10)',
      },
    },
  },
};

export const findOpinionLeadersTool: LLMTool = {
  name: 'find_opinion_leaders',
  description:
    'Find opinion leaders in a specialty - doctors with most publications, citations, and influence in the network.',
  parameters: {
    type: 'object',
    properties: {
      specialty: {
        type: 'string',
        description: 'Medical specialty to find leaders in',
      },
      limit: {
        type: 'number',
        description: 'Max results (default: 10)',
      },
    },
    required: ['specialty'],
  },
};

// ============================================================================
// CAREER & MENTORSHIP TOOLS - Phase 2
// ============================================================================

export const findMentorsTool: LLMTool = {
  name: 'find_mentors',
  description:
    'Find potential mentors for a doctor based on specialty, experience, and network proximity. Shows doctors with mentorship experience and matching expertise.',
  parameters: {
    type: 'object',
    properties: {
      specialty: {
        type: 'string',
        description: 'Specialty area for mentorship',
      },
      menteeId: {
        type: 'string',
        description: 'Doctor pgId of the mentee seeking mentorship',
      },
      minYearsExperience: {
        type: 'number',
        description: 'Minimum years of experience for mentor (default: 10)',
      },
      limit: {
        type: 'number',
        description: 'Max results (default: 10)',
      },
    },
  },
};

export const findMenteesTool: LLMTool = {
  name: 'find_mentees',
  description:
    'Find doctors who might benefit from mentorship - useful for experienced doctors looking to mentor others.',
  parameters: {
    type: 'object',
    properties: {
      mentorId: {
        type: 'string',
        description: 'Doctor pgId of the potential mentor',
      },
      specialty: {
        type: 'string',
        description: 'Filter by specialty',
      },
      maxYearsExperience: {
        type: 'number',
        description: 'Maximum years of experience for mentee (default: 5)',
      },
      limit: {
        type: 'number',
        description: 'Max results (default: 10)',
      },
    },
  },
};

export const analyzeCareerPathsTool: LLMTool = {
  name: 'analyze_career_paths',
  description:
    'Analyze career paths for a doctor. Shows official career milestones, progress, and recommendations based on their current profile.',
  parameters: {
    type: 'object',
    properties: {
      doctorId: {
        type: 'string',
        description: 'Doctor pgId to analyze career path for',
      },
      specialty: {
        type: 'string',
        description: 'Specialty to analyze career paths in',
      },
    },
    required: ['doctorId'],
  },
};

export const findCertificationsTool: LLMTool = {
  name: 'find_certifications',
  description:
    'Find certifications available or relevant for a specialty. Can also check which certifications a doctor holds.',
  parameters: {
    type: 'object',
    properties: {
      specialty: {
        type: 'string',
        description: 'Filter by medical specialty',
      },
      doctorId: {
        type: 'string',
        description: 'Doctor pgId to check their certifications',
      },
      certificationType: {
        type: 'string',
        description: 'Type: MEDICAL_BOARD, SPECIALTY, SUBSPECIALTY, CONTINUING_EDUCATION',
      },
      limit: {
        type: 'number',
        description: 'Max results (default: 10)',
      },
    },
  },
};

export const findCareerProgressTool: LLMTool = {
  name: 'find_career_progress',
  description:
    'Check a doctor\'s progress in their career path. Shows completed milestones, current progress, and next steps.',
  parameters: {
    type: 'object',
    properties: {
      doctorId: {
        type: 'string',
        description: 'Doctor pgId to check progress for',
      },
      careerPathId: {
        type: 'string',
        description: 'Specific career path pgId (optional)',
      },
    },
    required: ['doctorId'],
  },
};

// ============================================================================
// EVENTS & COURSES TOOLS - Phase 3
// ============================================================================

export const findEventsTool: LLMTool = {
  name: 'find_events',
  description:
    'Find medical events (congresses, symposiums, workshops, webinars). Can filter by type, topic, date range, or location.',
  parameters: {
    type: 'object',
    properties: {
      eventType: {
        type: 'string',
        description: 'Type: CONGRESS, SYMPOSIUM, WORKSHOP, WEBINAR, CONFERENCE, MEETUP',
      },
      topic: {
        type: 'string',
        description: 'Topic or specialty area',
      },
      city: {
        type: 'string',
        description: 'City filter',
      },
      isOnline: {
        type: 'boolean',
        description: 'Filter for online events only',
      },
      startDate: {
        type: 'string',
        description: 'Minimum start date (YYYY-MM-DD)',
      },
      doctorId: {
        type: 'string',
        description: 'Doctor pgId - to find events they might be interested in',
      },
      limit: {
        type: 'number',
        description: 'Max results (default: 10)',
      },
    },
  },
};

export const findCoursesTool: LLMTool = {
  name: 'find_courses',
  description:
    'Find educational courses available. Can filter by topic, instructor, level, or find courses a doctor is enrolled in.',
  parameters: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        description: 'Topic or specialty area',
      },
      instructorId: {
        type: 'string',
        description: 'Doctor pgId of the instructor',
      },
      enrolledDoctorId: {
        type: 'string',
        description: 'Doctor pgId to find courses they are enrolled in',
      },
      level: {
        type: 'string',
        description: 'Level: BEGINNER, INTERMEDIATE, ADVANCED',
      },
      limit: {
        type: 'number',
        description: 'Max results (default: 10)',
      },
    },
  },
};

export const getLearningPathsTool: LLMTool = {
  name: 'get_learning_paths',
  description:
    'Get recommended learning paths for a doctor based on their specialty, career goals, and skill gaps. Suggests events, courses, and certifications.',
  parameters: {
    type: 'object',
    properties: {
      doctorId: {
        type: 'string',
        description: 'Doctor pgId to get learning recommendations for',
      },
      specialty: {
        type: 'string',
        description: 'Focus specialty for learning',
      },
    },
    required: ['doctorId'],
  },
};

export const findEventSpeakersTool: LLMTool = {
  name: 'find_event_speakers',
  description:
    'Find speakers at medical events. Can find events where a specific doctor is speaking or find speakers for a topic.',
  parameters: {
    type: 'object',
    properties: {
      eventId: {
        type: 'string',
        description: 'Event pgId to find speakers for',
      },
      doctorId: {
        type: 'string',
        description: 'Doctor pgId to find events they are speaking at',
      },
      topic: {
        type: 'string',
        description: 'Find speakers who presented on this topic',
      },
      limit: {
        type: 'number',
        description: 'Max results (default: 10)',
      },
    },
  },
};

export const ALL_SEARCH_TOOLS = [
  cypherQueryTool,
  doctorLookupTool,
  jobSearchTool,
  institutionSearchTool,
  connectionPathTool,
  findDoctorsBySkillTool,
  doctorNetworkStatsTool,
  findCommonGroundTool,
  institutionStaffTool,
  // Collaboration tools
  findPublicationsTool,
  findCoauthorsTool,
  findStudyGroupsTool,
  findCaseStudiesTool,
  findResearchProjectsTool,
  findOpinionLeadersTool,
  // Career & Mentorship tools
  findMentorsTool,
  findMenteesTool,
  analyzeCareerPathsTool,
  findCertificationsTool,
  findCareerProgressTool,
  // Events & Courses tools
  findEventsTool,
  findCoursesTool,
  getLearningPathsTool,
  findEventSpeakersTool,
];
