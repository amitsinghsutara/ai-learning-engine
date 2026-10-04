import { describe, expect, it } from "vitest";
import type { LearningEvent } from "@ale/shared";
import { buildLearnerProfile, identifyWeakestSkill } from "../src/learnerProfile.js";

function makeEvent(overrides: Partial<LearningEvent>): LearningEvent {
  return {
    id: Math.random().toString(36).slice(2),
    learnerId: "learner-1",
    skill: "short-vowels",
    target: "cat",
    correct: true,
    timestamp: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("buildLearnerProfile", () => {
  it("returns an empty profile for a learner with no events", () => {
    const profile = buildLearnerProfile([]);
    expect(profile.skills).toEqual([]);
    expect(profile.overallMastery).toBe(0);
  });

  it("builds one skill profile per distinct skill", () => {
    const events = [
      makeEvent({ skill: "short-vowels", correct: true }),
      makeEvent({ skill: "initial-sounds", correct: true }),
      makeEvent({ skill: "initial-sounds", correct: true })
    ];
    const profile = buildLearnerProfile(events);
    expect(profile.skills.map((s) => s.stats.skill)).toEqual(["short-vowels", "initial-sounds"]);
    expect(profile.overallMastery).toBeGreaterThan(0);
  });
});

describe("identifyWeakestSkill", () => {
  it("returns null when there are no skills", () => {
    expect(identifyWeakestSkill({ skills: [], overallMastery: 0 })).toBeNull();
  });

  it("returns the skill with the lowest mastery", () => {
    const events = [
      makeEvent({ skill: "short-vowels", correct: false, foilType: "V" }),
      makeEvent({ skill: "short-vowels", correct: false, foilType: "V" }),
      makeEvent({ skill: "initial-sounds", correct: true }),
      makeEvent({ skill: "initial-sounds", correct: true })
    ];
    const profile = buildLearnerProfile(events);
    const weakest = identifyWeakestSkill(profile);
    expect(weakest?.stats.skill).toBe("short-vowels");
  });
});
