import { describe, expect, it } from "vitest";
import type { PracticeSet } from "@ale/shared";
import { filterValidPracticeSet, isValidPracticeItem } from "../src/contentValidation.js";

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
