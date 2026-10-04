/**
 * Narrow, pre-digested input the AI layer is allowed to see for a skill analysis
 * request. Deliberately decoupled from `@ale/learning-engine`'s internal types —
 * the API layer adapts a learning-engine bundle into this shape, keeping the AI
 * package swappable and independent of analysis internals.
 */
export interface SkillAnalysisInput {
  learnerAge?: number;
  skill: string;
  attempts: number;
  accuracy: number;
  mastery: number;
  averageResponseTimeMs: number | null;
  foilErrors: Record<string, number>;
  recentAccuracy: number | null;
  historicalAccuracy: number | null;
}

export interface PracticeGenerationInput {
  skill: string;
  focus: string;
  difficulty: string;
  practiceCount: number;
  /** Recent targets to avoid immediate repeats, if known. */
  recentTargets?: string[];
}

/** One skill's deterministic mastery/trend, as the AI layer is allowed to see it. */
export interface ProgressSkillInput {
  id: string;
  name: string;
  mastery: number;
  trend: string;
}

/**
 * Narrow, pre-digested input for generating a parent-facing progress narrative. Like
 * `SkillAnalysisInput`, the AI package only ever receives this — never raw events or
 * database rows — and the LLM only writes text from it; it never recomputes mastery,
 * trends, or which skills are strong/weak.
 */
export interface ProgressNarrativeInput {
  learnerAge?: number;
  overallMastery: number;
  overallTrend: string;
  skills: ProgressSkillInput[];
  /** Skill ids already identified (deterministically) as strengths, strongest first. */
  strongSkillIds: string[];
  /** Skill ids already identified (deterministically) as needing practice, weakest first. */
  weakSkillIds: string[];
}
