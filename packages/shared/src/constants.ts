export const DIFFICULTY_LEVELS = ["beginner", "easy", "medium", "advanced"] as const;

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

/**
 * How many of a skill's most recent events count as "recent" when comparing
 * recent vs. historical performance in the deterministic analysis.
 */
export const RECENT_WINDOW_SIZE = 10;

/** The three overall-trend values the "Child's Progress" API contract allows. */
export const PROGRESS_TRENDS = ["improving", "stable", "needs-practice"] as const;

export type ProgressTrend = (typeof PROGRESS_TRENDS)[number];

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  LEARNER_NOT_FOUND: "LEARNER_NOT_FOUND",
  NO_EVENTS_FOUND: "NO_EVENTS_FOUND",
  OLLAMA_UNAVAILABLE: "OLLAMA_UNAVAILABLE",
  OLLAMA_TIMEOUT: "OLLAMA_TIMEOUT",
  INVALID_AI_RESPONSE: "INVALID_AI_RESPONSE",
  INTERNAL_ERROR: "INTERNAL_ERROR"
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
