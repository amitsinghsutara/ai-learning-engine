import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";
import type { LLMProvider } from "../src/provider.js";
import type { PracticeGenerationInput } from "../src/types.js";
import { generatePracticeItems } from "../src/generator.js";
import { AIProviderError } from "../src/errors.js";

function providerReturning(payload: unknown): LLMProvider {
  return {
    generateText: async () => "",
    generateStructured: async <T>(_prompt: string, schema: ZodType<T>): Promise<T> => schema.parse(payload)
  };
}

const INPUT: PracticeGenerationInput = {
  skill: "short-vowels",
  focus: "/a/ vs /i/",
  difficulty: "easy",
  practiceCount: 2
};

describe("generatePracticeItems", () => {
  it("returns validated items when the LLM response is clean", async () => {
    const provider = providerReturning({
      skill: "short-vowels",
      focus: "/a/ vs /i/",
      items: [{ target: "cat", choices: ["cat", "cit", "cut", "cot"] }]
    });
    const result = await generatePracticeItems(provider, INPUT);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.target).toBe("cat");
  });

  it("drops items that fail content rules but keeps the valid ones", async () => {
    const provider = providerReturning({
      skill: "short-vowels",
      focus: "/a/ vs /i/",
      items: [
        { target: "cat", choices: ["cat", "cit"] },
        { target: "bad word!", choices: ["bad word!", "ok"] }
      ]
    });
    const result = await generatePracticeItems(provider, INPUT);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.target).toBe("cat");
  });

  it("throws INVALID_AI_RESPONSE when no items survive content validation", async () => {
    const provider = providerReturning({
      skill: "short-vowels",
      focus: "/a/ vs /i/",
      items: [{ target: "bad word!", choices: ["bad word!", "ok"] }]
    });
    await expect(generatePracticeItems(provider, INPUT)).rejects.toThrow(AIProviderError);
  });
});
