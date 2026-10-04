import { z } from "zod";
import { DIFFICULTY_LEVELS } from "@ale/shared";

/**
 * Schema the LLM's analysis response must satisfy. This is both the structured-output
 * contract sent to Ollama and the validation gate every response is checked against
 * before it reaches the API layer.
 */
export const learningRecommendationSchema = z.object({
  primaryDifficulty: z.string().trim().min(1).max(200),
  secondaryDifficulty: z.string().trim().min(1).max(200).optional(),
  focus: z.string().trim().min(1).max(300),
  difficulty: z.enum(DIFFICULTY_LEVELS),
  practiceCount: z.number().int().min(1).max(20),
  hint: z.string().trim().min(1).max(300),
  explanation: z.string().trim().min(1).max(1000),
  confidence: z.number().min(0).max(1)
});

/**
 * Deliberately structural only (shape, types, length bounds) — NOT business rules
 * like "choices must include the target" or "no duplicate choices". Those live in
 * `contentValidation.ts` and filter out individual bad items instead of failing
 * the whole set: a local model that gets one item out of twelve wrong on an
 * otherwise-valid-JSON response shouldn't cost all twelve.
 */
export const practiceItemSchema = z.object({
  target: z.string().trim().min(1).max(100),
  choices: z.array(z.string().trim().min(1).max(100)).min(2).max(8)
});

export const practiceSetSchema = z.object({
  skill: z.string().trim().min(1).max(100),
  focus: z.string().trim().min(1).max(300),
  items: z.array(practiceItemSchema).min(1).max(20)
});
