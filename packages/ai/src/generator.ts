import type { PracticeSet } from "@ale/shared";
import { ERROR_CODES } from "@ale/shared";
import type { LLMProvider } from "./provider.js";
import type { PracticeGenerationInput } from "./types.js";
import { buildPracticePrompt } from "./prompts.js";
import { practiceSetSchema } from "./schemas.js";
import { filterValidPracticeSet } from "./contentValidation.js";
import { AIProviderError } from "./errors.js";

/**
 * Generates candidate practice items and runs them through content validation
 * before returning. The LLM never renders content directly to a learner —
 * everything passes through `filterValidPracticeSet` first.
 */
export async function generatePracticeItems(
  provider: LLMProvider,
  input: PracticeGenerationInput
): Promise<PracticeSet> {
  const prompt = buildPracticePrompt(input);
  const candidate = await provider.generateStructured(prompt, practiceSetSchema);
  const validated = filterValidPracticeSet(candidate);

  if (validated.items.length === 0) {
    throw new AIProviderError(
      ERROR_CODES.INVALID_AI_RESPONSE,
      "The AI did not generate any practice items that passed content validation."
    );
  }

  return validated;
}
