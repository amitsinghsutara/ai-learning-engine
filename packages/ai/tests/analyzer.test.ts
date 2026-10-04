import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";
import type { LLMProvider } from "../src/provider.js";
import type { SkillAnalysisInput } from "../src/types.js";
import { analyzeLearnerSkill } from "../src/analyzer.js";

const VALID_RECOMMENDATION = {
  primaryDifficulty: "Confusing short vowel sounds",
  focus: "/a/ vs /i/ discrimination",
  difficulty: "easy" as const,
  practiceCount: 5,
  hint: "Listen carefully to the middle sound.",
  explanation: "Errors are concentrated on vowel substitutions.",
  confidence: 0.8
};

function makeProvider(responses: unknown[]): LLMProvider {
  let call = 0;
  return {
    generateText: async () => "",
    generateStructured: async <T>(_prompt: string, schema: ZodType<T>): Promise<T> => {
      const response = responses[Math.min(call, responses.length - 1)];
      call += 1;
      return schema.parse(response);
    }
  };
}

const INPUT: SkillAnalysisInput = {
  skill: "short-vowels",
  attempts: 20,
  accuracy: 0.6,
  mastery: 0.61,
  averageResponseTimeMs: 4200,
  foilErrors: { V: 6 },
  recentAccuracy: 0.5,
  historicalAccuracy: 0.7
};

describe("analyzeLearnerSkill", () => {
  it("returns the provider's validated recommendation", async () => {
    const provider = makeProvider([VALID_RECOMMENDATION]);
    const result = await analyzeLearnerSkill(provider, INPUT);
    expect(result).toEqual(VALID_RECOMMENDATION);
  });

  it("propagates provider errors (e.g. Ollama unavailable) without swallowing them", async () => {
    const provider: LLMProvider = {
      generateText: async () => "",
      generateStructured: async () => {
        throw new Error("boom");
      }
    };
    await expect(analyzeLearnerSkill(provider, INPUT)).rejects.toThrow("boom");
  });
});
