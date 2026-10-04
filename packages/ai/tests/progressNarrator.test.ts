import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";
import type { LLMProvider } from "../src/provider.js";
import type { ProgressNarrativeInput } from "../src/types.js";
import { generateProgressNarrative } from "../src/progressNarrator.js";

const VALID_NARRATIVE = {
  overallSummary: "Your child is making steady progress with spelling and phonics.",
  strengths: ["Initial consonant sounds"],
  practiceAreas: [
    {
      skillId: "short-vowels",
      title: "Short Vowel Sounds",
      description: "Short vowel sounds are currently more challenging.",
      suggestion: "Practice words with short /a/ and /i/ sounds."
    }
  ],
  encouragement: "Keep encouraging your child."
};

function makeProvider(response: unknown): LLMProvider {
  return {
    generateText: async () => "",
    generateStructured: async <T>(_prompt: string, schema: ZodType<T>): Promise<T> => schema.parse(response)
  };
}

const INPUT: ProgressNarrativeInput = {
  overallMastery: 0.78,
  overallTrend: "improving",
  skills: [
    { id: "initial-sounds", name: "Initial Sounds", mastery: 0.89, trend: "strong" },
    { id: "short-vowels", name: "Short Vowels", mastery: 0.4, trend: "needs-practice" }
  ],
  strongSkillIds: ["initial-sounds"],
  weakSkillIds: ["short-vowels"]
};

describe("generateProgressNarrative", () => {
  it("returns the provider's validated, content-filtered narrative", async () => {
    const provider = makeProvider(VALID_NARRATIVE);
    const result = await generateProgressNarrative(provider, INPUT);
    expect(result).toEqual(VALID_NARRATIVE);
  });

  it("drops a practiceArea for a skill id the caller never listed", async () => {
    const provider = makeProvider({
      ...VALID_NARRATIVE,
      practiceAreas: [{ ...VALID_NARRATIVE.practiceAreas[0], skillId: "made-up-skill" }]
    });
    const result = await generateProgressNarrative(provider, INPUT);
    expect(result.practiceAreas).toEqual([]);
  });

  it("propagates provider errors (e.g. Ollama unavailable) without swallowing them", async () => {
    const provider: LLMProvider = {
      generateText: async () => "",
      generateStructured: async () => {
        throw new Error("boom");
      }
    };
    await expect(generateProgressNarrative(provider, INPUT)).rejects.toThrow("boom");
  });
});
