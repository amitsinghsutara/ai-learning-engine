import { describe, expect, it } from "vitest";
import type { LearningEvent } from "@ale/shared";
import { computeSkillStats, listSkills } from "../src/skillAnalysis.js";

function makeEvent(overrides: Partial<LearningEvent>): LearningEvent {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    learnerId: "learner-1",
    skill: "short-vowels",
    target: "cat",
    correct: true,
    timestamp: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("computeSkillStats", () => {
  it("returns zeroed stats for a skill with no events", () => {
    const stats = computeSkillStats([], "short-vowels");
    expect(stats.attempts).toBe(0);
    expect(stats.accuracy).toBe(0);
    expect(stats.averageResponseTimeMs).toBeNull();
    expect(stats.recentAccuracy).toBeNull();
    expect(stats.historicalAccuracy).toBeNull();
  });

  it("computes accuracy and counts", () => {
    const events = [
      makeEvent({ correct: true }),
      makeEvent({ correct: false, foilType: "V" }),
      makeEvent({ correct: false, foilType: "V" }),
      makeEvent({ correct: true })
    ];
    const stats = computeSkillStats(events, "short-vowels");
    expect(stats.attempts).toBe(4);
    expect(stats.correct).toBe(2);
    expect(stats.incorrect).toBe(2);
    expect(stats.accuracy).toBe(0.5);
    expect(stats.foilErrors).toEqual({ V: 2 });
  });

  it("ignores events for other skills", () => {
    const events = [
      makeEvent({ skill: "short-vowels" }),
      makeEvent({ skill: "initial-sounds" })
    ];
    const stats = computeSkillStats(events, "short-vowels");
    expect(stats.attempts).toBe(1);
  });

  it("averages response time only over events that recorded it", () => {
    const events = [
      makeEvent({ responseTimeMs: 1000 }),
      makeEvent({ responseTimeMs: 3000 }),
      makeEvent({ responseTimeMs: undefined })
    ];
    const stats = computeSkillStats(events, "short-vowels");
    expect(stats.averageResponseTimeMs).toBe(2000);
  });

  it("splits recent vs historical accuracy by chronological order, not submission order", () => {
    const events = [
      makeEvent({ timestamp: "2026-01-03T00:00:00.000Z", correct: false }),
      makeEvent({ timestamp: "2026-01-01T00:00:00.000Z", correct: true }),
      makeEvent({ timestamp: "2026-01-02T00:00:00.000Z", correct: true })
    ];
    const stats = computeSkillStats(events, "short-vowels", 2);
    // Chronological order: Jan 1 (correct), Jan 2 (correct), Jan 3 (incorrect)
    // Recent window of 2 = [Jan 2, Jan 3] -> 1/2 = 0.5
    // Historical = [Jan 1] -> 1/1 = 1
    expect(stats.recentAccuracy).toBe(0.5);
    expect(stats.historicalAccuracy).toBe(1);
  });

  it("returns null historical accuracy when attempts fit entirely in the recent window", () => {
    const events = [makeEvent({}), makeEvent({})];
    const stats = computeSkillStats(events, "short-vowels", 10);
    expect(stats.historicalAccuracy).toBeNull();
    expect(stats.recentAccuracy).toBe(1);
  });
});

describe("listSkills", () => {
  it("returns distinct skills in first-seen order", () => {
    const events = [
      makeEvent({ skill: "short-vowels" }),
      makeEvent({ skill: "initial-sounds" }),
      makeEvent({ skill: "short-vowels" })
    ];
    expect(listSkills(events)).toEqual(["short-vowels", "initial-sounds"]);
  });
});
