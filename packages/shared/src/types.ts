import type { DifficultyLevel, ProgressTrend } from "./constants.js";

/** An anonymous learner. No names, emails, or other identifying data are required. */
export interface Learner {
  id: string;
  displayName?: string;
  age?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * A single generic learning interaction. The model is intentionally domain-agnostic
 * (not spelling-specific) so the same event shape can carry reading, phonics, or
 * math interactions in the future.
 */
export interface LearningEvent {
  id: string;
  learnerId: string;
  skill: string;
  target: string;
  selectedAnswer?: string;
  correct: boolean;
  foilType?: string;
  difficulty?: string;
  responseTimeMs?: number;
  attemptNumber?: number;
  timestamp: string;
}

/** Deterministic, non-AI statistics for one learner/skill pair. */
export interface SkillStats {
  skill: string;
  attempts: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  averageResponseTimeMs: number | null;
  foilErrors: Record<string, number>;
  recentAccuracy: number | null;
  historicalAccuracy: number | null;
}

/** Deterministic mastery estimate for one learner/skill pair. */
export interface MasteryResult {
  skill: string;
  mastery: number;
}

/** AI-generated, Zod-validated recommendation for what a learner should practice next. */
export interface LearningRecommendation {
  primaryDifficulty: string;
  secondaryDifficulty?: string;
  focus: string;
  difficulty: DifficultyLevel;
  practiceCount: number;
  hint: string;
  explanation: string;
  confidence: number;
}

/** A single AI-generated, validated practice question. */
export interface PracticeItem {
  target: string;
  choices: string[];
}

/** A set of AI-generated practice items for a given skill/focus. */
export interface PracticeSet {
  skill: string;
  focus: string;
  items: PracticeItem[];
}

/** One skill's deterministic mastery/trend, shaped for the "Child's Progress" API response. */
export interface SkillProgress {
  id: string;
  name: string;
  mastery: number;
  trend: string;
}

/** An AI-generated, validated suggestion for a single skill a learner is finding challenging. */
export interface ProgressPracticeArea {
  skillId: string;
  title: string;
  description: string;
  suggestion: string;
}

/**
 * The AI-generated, Zod-validated parent-facing text for a progress summary. The LLM only
 * writes this narrative — it never computes mastery, trends, or which skills are strong/weak.
 */
export interface ProgressNarrative {
  overallSummary: string;
  strengths: string[];
  practiceAreas: ProgressPracticeArea[];
  encouragement: string;
}

/**
 * The full "Child's Progress" API response: deterministic mastery/trend data plus the
 * AI-generated narrative, assembled by the API layer. This is the exact wire shape the
 * reference game client (Forest Spelling Adventure) validates against its own Zod schema.
 */
export interface ProgressSummary {
  learnerId: string;
  generatedAt: string;
  overall: {
    mastery: number;
    trend: ProgressTrend;
    summary: string;
  };
  skills: SkillProgress[];
  strengths: string[];
  practiceAreas: ProgressPracticeArea[];
  encouragement: string;
}
