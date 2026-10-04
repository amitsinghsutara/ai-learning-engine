import type { LearningRecommendation } from "@ale/shared";
import type { LLMProvider } from "./provider.js";
import type { SkillAnalysisInput } from "./types.js";
import { buildAnalysisPrompt } from "./prompts.js";
import { learningRecommendationSchema } from "./schemas.js";

/**
 * Produces a validated, structured recommendation for one learner/skill.
 * The LLM only interprets and generates here — mastery and all statistics
 * were already computed deterministically before this is called.
 */
export async function analyzeLearnerSkill(
  provider: LLMProvider,
  input: SkillAnalysisInput
): Promise<LearningRecommendation> {
  const prompt = buildAnalysisPrompt(input);
  return provider.generateStructured(prompt, learningRecommendationSchema);
}
