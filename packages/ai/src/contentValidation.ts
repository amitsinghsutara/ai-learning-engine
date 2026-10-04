import type { PracticeItem, PracticeSet } from "@ale/shared";

/**
 * A word-like token: letters, apostrophes, and hyphens only. This is intentionally
 * generic to early-literacy/phonics content; a future domain (e.g. math) would
 * supply its own validator rather than reusing this one.
 */
const WORD_PATTERN = /^[A-Za-z'-]+$/;

/**
 * Educational content rules applied after schema validation, before a practice
 * item is allowed to reach a learner. Invalid items are dropped rather than
 * failing the whole set, since one bad item from the LLM shouldn't discard
 * several good ones.
 */
export function isValidPracticeItem(item: PracticeItem): boolean {
  if (!WORD_PATTERN.test(item.target)) return false;
  if (!item.choices.every((choice) => WORD_PATTERN.test(choice))) return false;
  if (!item.choices.includes(item.target)) return false;

  const normalizedChoices = item.choices.map((c) => c.toLowerCase());
  if (new Set(normalizedChoices).size !== normalizedChoices.length) return false;

  if (item.choices.length < 2 || item.choices.length > 6) return false;

  return true;
}

/** Filters a candidate practice set down to only the items that pass content rules. */
export function filterValidPracticeSet(candidate: PracticeSet): PracticeSet {
  return {
    ...candidate,
    items: candidate.items.filter(isValidPracticeItem)
  };
}
