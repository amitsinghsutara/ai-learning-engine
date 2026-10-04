import { describe, expect, it } from "vitest";
import { learningRecommendationSchema, practiceItemSchema } from "../src/schemas.js";

describe("learningRecommendationSchema", () => {
  const base = {
    primaryDifficulty: "Vowel confusion",
    focus: "/a/ vs /i/",
    difficulty: "easy",
    practiceCount: 5,
    hint: "Listen carefully.",
    explanation: "Because of repeated vowel substitutions.",
    confidence: 0.75
  };

  it("accepts a well-formed recommendation", () => {
    expect(learningRecommendationSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an invalid difficulty level", () => {
    const result = learningRecommendationSchema.safeParse({ ...base, difficulty: "impossible" });
    expect(result.success).toBe(false);
  });

  it("rejects confidence outside [0, 1]", () => {
    const result = learningRecommendationSchema.safeParse({ ...base, confidence: 1.5 });
    expect(result.success).toBe(false);
  });
});

describe("practiceItemSchema", () => {
  it("accepts a well-formed item", () => {
    const result = practiceItemSchema.safeParse({ target: "cat", choices: ["cat", "cit"] });
    expect(result.success).toBe(true);
  });

  it("is structural only: it does not enforce that choices include the target", () => {
    // Business rules like this belong to contentValidation.ts, not this schema —
    // see schemas.ts for why. Covered by contentValidation.test.ts.
    const result = practiceItemSchema.safeParse({ target: "cat", choices: ["dog", "cit"] });
    expect(result.success).toBe(true);
  });

  it("rejects fewer than 2 choices", () => {
    const result = practiceItemSchema.safeParse({ target: "cat", choices: ["cat"] });
    expect(result.success).toBe(false);
  });
});
