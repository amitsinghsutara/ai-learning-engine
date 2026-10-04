import { describe, expect, it } from "vitest";
import type { SkillStats } from "@ale/shared";
import { identifyDominantError } from "../src/errorAnalysis.js";

function makeStats(overrides: Partial<SkillStats>): SkillStats {
  return {
    skill: "short-vowels",
    attempts: 10,
    correct: 4,
    incorrect: 6,
    accuracy: 0.4,
    averageResponseTimeMs: null,
    foilErrors: {},
    recentAccuracy: null,
    historicalAccuracy: null,
    ...overrides
  };
}

describe("identifyDominantError", () => {
  it("returns null when there are no errors", () => {
    expect(identifyDominantError(makeStats({ incorrect: 0, foilErrors: {} }))).toBeNull();
  });

  it("identifies the most frequent foil type and its share", () => {
    const stats = makeStats({ incorrect: 6, foilErrors: { V: 4, IC: 1, FC: 1 } });
    const result = identifyDominantError(stats);
    expect(result).toEqual({ foilType: "V", count: 4, share: 4 / 6 });
  });
});
