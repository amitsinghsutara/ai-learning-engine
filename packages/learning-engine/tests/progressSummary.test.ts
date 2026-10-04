import { describe, expect, it } from "vitest";
import type { LearningEvent } from "@ale/shared";
import {
  buildProgressSummaryBundle,
  classifyOverallTrend,
  humanizeSkillId,
  type SkillProgressProfile
} from "../src/progressSummary.js";

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

describe("humanizeSkillId", () => {
  it("turns a slug into a title-cased label", () => {
    expect(humanizeSkillId("cvc-short-vowels")).toBe("Cvc Short Vowels");
    expect(humanizeSkillId("initial-sounds")).toBe("Initial Sounds");
  });
});

describe("buildProgressSummaryBundle", () => {
  it("returns an empty bundle for a learner with no events", () => {
    const bundle = buildProgressSummaryBundle([]);
    expect(bundle.skills).toEqual([]);
    expect(bundle.overallMastery).toBe(0);
    expect(bundle.overallTrend).toBe("stable");
    expect(bundle.strongSkillIds).toEqual([]);
    expect(bundle.weakSkillIds).toEqual([]);
  });

  it("does not call out a skill with too few attempts as a strength or practice area", () => {
    const events = [makeEvent({ skill: "short-vowels", correct: true })];
    const bundle = buildProgressSummaryBundle(events);
    expect(bundle.strongSkillIds).toEqual([]);
    expect(bundle.weakSkillIds).toEqual([]);
    expect(bundle.skills[0]?.trend).toBe("stable");
  });

  it("identifies a high-mastery skill with enough attempts as a strength", () => {
    const events = Array.from({ length: 5 }, () => makeEvent({ skill: "initial-sounds", correct: true }));
    const bundle = buildProgressSummaryBundle(events);
    expect(bundle.strongSkillIds).toEqual(["initial-sounds"]);
    expect(bundle.skills[0]?.name).toBe("Initial Sounds");
  });

  it("identifies a low-mastery skill with enough attempts as needing practice", () => {
    const events = Array.from({ length: 5 }, () =>
      makeEvent({ skill: "short-vowels", correct: false, foilType: "V" })
    );
    const bundle = buildProgressSummaryBundle(events);
    expect(bundle.weakSkillIds).toEqual(["short-vowels"]);
    expect(bundle.overallTrend).toBe("needs-practice");
  });

  it("caps callouts at 3 skills, strongest/weakest first", () => {
    const events = ["a", "b", "c", "d"].flatMap((skill) =>
      Array.from({ length: 5 }, (_, i) => makeEvent({ skill, correct: true, target: `t${i}` }))
    );
    const bundle = buildProgressSummaryBundle(events);
    expect(bundle.strongSkillIds.length).toBeLessThanOrEqual(3);
  });
});

describe("classifyOverallTrend", () => {
  function skill(trend: string): SkillProgressProfile {
    return { id: trend, name: trend, mastery: 0.5, trend, attempts: 10 };
  }

  it("returns stable when there are no skills", () => {
    expect(classifyOverallTrend([])).toBe("stable");
  });

  it("returns needs-practice when most skills need practice", () => {
    expect(classifyOverallTrend([skill("needs-practice"), skill("needs-practice"), skill("stable")])).toBe(
      "needs-practice"
    );
  });

  it("returns improving when at least one skill is improving and none need practice", () => {
    expect(classifyOverallTrend([skill("improving"), skill("strong")])).toBe("improving");
  });

  it("returns stable otherwise", () => {
    expect(classifyOverallTrend([skill("stable"), skill("strong")])).toBe("stable");
  });
});
