import { z } from "zod";
import { DIFFICULTY_LEVELS } from "./constants.js";

export const createLearnerSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  age: z.number().int().min(2).max(18).optional()
});

export type CreateLearnerInput = z.infer<typeof createLearnerSchema>;

/**
 * Validates an incoming learning event. The event shape is deliberately generic
 * (skill/target/foilType are free-form strings) so it is not coupled to any one
 * game or curriculum.
 */
export const createLearningEventSchema = z.object({
  skill: z.string().trim().min(1).max(100),
  target: z.string().trim().min(1).max(200),
  selectedAnswer: z.string().trim().max(200).optional(),
  correct: z.boolean(),
  foilType: z.string().trim().max(50).optional(),
  difficulty: z.string().trim().max(50).optional(),
  responseTimeMs: z.number().int().min(0).max(600_000).optional(),
  attemptNumber: z.number().int().min(1).max(100).optional(),
  timestamp: z.string().datetime().optional()
});

export type CreateLearningEventInput = z.infer<typeof createLearningEventSchema>;

export const learnerIdParamSchema = z.object({
  learnerId: z.string().trim().min(1)
});

export const difficultyLevelSchema = z.enum(DIFFICULTY_LEVELS);
