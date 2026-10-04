import { describe, expect, it } from "vitest";
import type { SkillStats } from "@ale/shared";
import { calculateMastery } from "../src/mastery.js";

function makeStats(overrides: Partial<SkillStats>): SkillStats {
  return {
    skill: "short-vowels",
    attempts: 10,
    correct: 10,
    incorrect: 0,
    accuracy: 1,
    averageResponseTimeMs: 2000,
    foilErrors: {},
    recentAccuracy: 1,
    historicalAccuracy: 1,
    ...overrides
  };
}

describe("calculateMastery", () => {
  it("returns 0 for a skill with no attempts", () => {
    expect(calculateMastery(makeStats({ attempts: 0, accuracy: 0, recentAccuracy: null, historicalAccuracy: null }))).toBe(0);
  });

  it("returns 1 for perfect, consistent, error-free performance", () => {
    expect(calculateMastery(makeStats({}))).toBe(1);
  });

  it("returns 0 for entirely incorrect, consistent performance", () => {
    const stats = makeStats({
      correct: 0,
      incorrect: 10,
      accuracy: 0,
      recentAccuracy: 0,
      historicalAccuracy: 0
    });
    expect(calculateMastery(stats)).toBe(0);
  });

  it("penalizes a concentrated error pattern more than a scattered one at equal accuracy", () => {
    const concentrated = makeStats({
      correct: 5,
      incorrect: 5,
      accuracy: 0.5,
      recentAccuracy: 0.5,
      historicalAccuracy: 0.5,
      foilErrors: { V: 5 }
    });
    const scattered = makeStats({
      correct: 5,
      incorrect: 5,
      accuracy: 0.5,
      recentAccuracy: 0.5,
      historicalAccuracy: 0.5,
      foilErrors: { V: 1, IC: 1, FC: 1, OTHER: 2 }
    });
    expect(calculateMastery(concentrated)).toBeLessThan(calculateMastery(scattered));
  });

  it("penalizes inconsistency between recent and historical accuracy", () => {
    const consistent = makeStats({ recentAccuracy: 0.7, historicalAccuracy: 0.7, accuracy: 0.7 });
    const inconsistent = makeStats({ recentAccuracy: 0.3, historicalAccuracy: 0.9, accuracy: 0.6 });
    expect(calculateMastery(consistent)).toBeGreaterThan(calculateMastery(inconsistent));
  });

  it("does not penalize consistency when there is not yet a historical window", () => {
    const newLearner = makeStats({ recentAccuracy: 0.8, historicalAccuracy: null, accuracy: 0.8 });
    const mastery = calculateMastery(newLearner);
    // consistencyScore defaults to 1, so mastery should equal 0.4*0.8 + 0.35*0.8 + 0.15*1 + 0.1*1
    expect(mastery).toBeCloseTo(0.4 * 0.8 + 0.35 * 0.8 + 0.15 * 1 + 0.1 * 1, 2);
  });

  it("always returns a value within [0, 1]", () => {
    const stats = makeStats({ accuracy: 1, recentAccuracy: 1, historicalAccuracy: 0 });
    const mastery = calculateMastery(stats);
    expect(mastery).toBeGreaterThanOrEqual(0);
    expect(mastery).toBeLessThanOrEqual(1);
  });
});
