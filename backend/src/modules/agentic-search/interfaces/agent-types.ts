/**
 * Shared interfaces for the Agentic Search module.
 * Replaces loose `any` types with concrete structures.
 */

// ─── Neo4j result helpers ─────────────────────────────────────

export interface Neo4jInteger {
  low: number;
  high: number;
}

/** Safely extract a plain number from a Neo4j Integer or plain number. */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'low' in value) {
    return (value as Neo4jInteger).low;
  }
  return Number(value) || 0;
}

// ─── Network Stats ────────────────────────────────────────────

export interface NetworkStatsResult {
  connections: number;
  followers: number;
  skillCount: number;
  endorsements: number;
}

// ─── Suggested Connection ─────────────────────────────────────

export interface SuggestedConnectionResult {
  id: string;
  name: string;
  picUrl: string | null;
  mutualConnections: number;
}

// ─── Highlighted Doctor ───────────────────────────────────────

export interface HighlightedDoctorResult {
  id: string;
  name: string;
  picUrl: string | null;
  sharedSpecs: number;
  connections: number;
}

// ─── Career Progress ──────────────────────────────────────────

export interface CareerProgressEntry {
  careerPath: string;
  specialty: string | undefined;
  totalMilestones: number;
  completed: number;
  inProgress: number;
  nextMilestone: { name: string; order: number } | null;
  milestones: Array<{
    name: string;
    order: number;
    status: string;
    isRequired: boolean;
  }>;
  percentage: number;
}

// ─── Certification Suggestion ─────────────────────────────────

export interface CertificationSuggestion {
  id: string;
  name: string;
  type: string;
  issuingBody: string;
  validityYears: number | null;
  specialty: string | undefined;
}

// ─── Mentor Suggestion ────────────────────────────────────────

export interface MentorSuggestion {
  id: string;
  name: string;
  city: string | null;
  yearsExperience: number;
  mutualConnections: number;
  currentMentees: number;
}

// ─── Collaboration Insights ───────────────────────────────────

export interface CollaborationInsights {
  summary: string;
  topRecommendations: Array<{
    type: 'coauthor' | 'studyGroup' | 'project' | 'caseStudy' | 'event';
    reason: string;
    action: string;
  }>;
  networkingTips: string[];
}

// ─── Career Insights ──────────────────────────────────────────

export interface CareerInsights {
  careerStage: string;
  strengths: string[];
  gaps: string[];
  topRecommendations: Array<{
    priority: string;
    type: string;
    description: string;
    timeline: string;
  }>;
  networkingAdvice: string;
}

// ─── Event Insights ───────────────────────────────────────────

export interface EventInsights {
  summary: string;
  educationGoals: Array<{
    goal: string;
    priority: string;
    deadline: string;
  }>;
  eventRecommendations: Array<{
    eventId: string;
    reason: string;
  }>;
  courseRecommendations: Array<{
    courseId: string;
    reason: string;
  }>;
  speakingPotential: string;
}
