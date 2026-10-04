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
