import type { ProgressNarrative } from "@ale/shared";
import type { LLMProvider } from "./provider.js";
import type { ProgressNarrativeInput } from "./types.js";
import { buildProgressNarrativePrompt } from "./prompts.js";
import { progressNarrativeSchema } from "./schemas.js";
import { filterProgressNarrative } from "./contentValidation.js";

/**
 * Produces a validated, parent-friendly progress narrative from pre-digested, deterministic
 * skill statistics. The LLM only writes the narrative text here — mastery, trends, and which
 * skills are strong/weak were already computed deterministically before this is called.
 */
export async function generateProgressNarrative(
  provider: LLMProvider,
  input: ProgressNarrativeInput
): Promise<ProgressNarrative> {
  const prompt = buildProgressNarrativePrompt(input);
  const candidate = await provider.generateStructured(prompt, progressNarrativeSchema);
  const validSkillIds = new Set(input.skills.map((skill) => skill.id));
  return filterProgressNarrative(candidate, validSkillIds);
}
