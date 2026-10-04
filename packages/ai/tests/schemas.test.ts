import { describe, expect, it } from "vitest";
import { learningRecommendationSchema, practiceItemSchema, progressNarrativeSchema } from "../src/schemas.js";

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

describe("progressNarrativeSchema", () => {
  const base = {
    overallSummary: "Your child is making steady progress.",
    strengths: ["Initial consonant sounds"],
    practiceAreas: [
      {
        skillId: "short-vowels",
        title: "Short Vowel Sounds",
        description: "Short vowel sounds are currently more challenging.",
        suggestion: "Practice words with short /a/ and /i/ sounds."
      }
    ],
    encouragement: "Keep up the great work."
  };

  it("accepts a well-formed narrative", () => {
    expect(progressNarrativeSchema.safeParse(base).success).toBe(true);
  });

  it("accepts empty strengths and practiceAreas arrays", () => {
    const result = progressNarrativeSchema.safeParse({ ...base, strengths: [], practiceAreas: [] });
    expect(result.success).toBe(true);
  });

  it("rejects an empty overallSummary", () => {
    const result = progressNarrativeSchema.safeParse({ ...base, overallSummary: "" });
    expect(result.success).toBe(false);
  });

  it("is structural only: it does not enforce that a practiceArea's skillId is a real skill", () => {
    // That business rule belongs to contentValidation.ts — see progressNarrator.test.ts.
    const result = progressNarrativeSchema.safeParse({
      ...base,
      practiceAreas: [{ ...base.practiceAreas[0], skillId: "made-up-skill" }]
    });
    expect(result.success).toBe(true);
  });
});
