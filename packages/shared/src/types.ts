import type { DifficultyLevel } from "./constants.js";

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
