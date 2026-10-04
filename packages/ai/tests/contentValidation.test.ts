import { describe, expect, it } from "vitest";
import type { PracticeSet, ProgressNarrative } from "@ale/shared";
import { filterProgressNarrative, filterValidPracticeSet, isValidPracticeItem } from "../src/contentValidation.js";

describe("isValidPracticeItem", () => {
  it("accepts a well-formed item", () => {
    expect(isValidPracticeItem({ target: "cat", choices: ["cat", "cit", "cut"] })).toBe(true);
  });

  it("rejects an item whose choices do not include the target", () => {
    // This is the real failure mode observed from local model output: a target
    // like "cat" with choices ["cot", "cut", "can"] that never includes "cat".
    expect(isValidPracticeItem({ target: "cat", choices: ["cot", "cut", "can"] })).toBe(false);
  });

  it("rejects duplicate choices", () => {
    expect(isValidPracticeItem({ target: "dog", choices: ["dug", "dot", "dug"] })).toBe(false);
  });

  it("rejects non-word-like targets or choices", () => {
    expect(isValidPracticeItem({ target: "bad word!", choices: ["bad word!", "ok"] })).toBe(false);
    expect(isValidPracticeItem({ target: "cat", choices: ["cat", "123"] })).toBe(false);
  });

  it("rejects too many choices", () => {
    expect(
      isValidPracticeItem({ target: "cat", choices: ["cat", "a", "b", "c", "d", "e", "f"] })
    ).toBe(false);
  });
});

describe("filterValidPracticeSet", () => {
  it("drops only the invalid items, keeping the rest of a mostly-good set", () => {
    const candidate: PracticeSet = {
      skill: "short-vowels",
      focus: "/a/ vs /i/",
      items: [
        { target: "cat", choices: ["cot", "cut", "can"] }, // missing target -> dropped
        { target: "dog", choices: ["dug", "dot", "dug"] }, // duplicate -> dropped
        { target: "hat", choices: ["hot", "hat", "hut"] } // valid -> kept
      ]
    };

    const result = filterValidPracticeSet(candidate);
    expect(result.items).toEqual([{ target: "hat", choices: ["hot", "hat", "hut"] }]);
  });
});

describe("filterProgressNarrative", () => {
  function makeNarrative(overrides: Partial<ProgressNarrative> = {}): ProgressNarrative {
    return {
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
      encouragement: "Keep up the great work.",
      ...overrides
    };
  }

  it("passes through a well-formed narrative unchanged", () => {
    const narrative = makeNarrative();
    expect(filterProgressNarrative(narrative, new Set(["short-vowels"]))).toEqual(narrative);
  });

  it("drops a practiceArea referencing a skill id the deterministic layer never flagged", () => {
    const narrative = makeNarrative();
    const result = filterProgressNarrative(narrative, new Set(["initial-sounds"]));
    expect(result.practiceAreas).toEqual([]);
  });

  it("drops a strength containing internal jargon", () => {
    const narrative = makeNarrative({ strengths: ["Good at foil type V", "Initial consonant sounds"] });
    const result = filterProgressNarrative(narrative, new Set(["short-vowels"]));
    expect(result.strengths).toEqual(["Initial consonant sounds"]);
  });

  it("replaces a jargon-containing overallSummary or encouragement with a safe fallback, never emptying them", () => {
    const narrative = makeNarrative({
      overallSummary: "Mastery coefficient is low for this skill.",
      encouragement: "The algorithm suggests more practice."
    });
    const result = filterProgressNarrative(narrative, new Set(["short-vowels"]));
    expect(result.overallSummary).not.toContain("coefficient");
    expect(result.overallSummary.length).toBeGreaterThan(0);
    expect(result.encouragement).not.toContain("algorithm");
    expect(result.encouragement.length).toBeGreaterThan(0);
  });
});
