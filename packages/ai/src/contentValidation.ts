import type { PracticeItem, PracticeSet, ProgressNarrative } from "@ale/shared";

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

/**
 * Internal terms that must never reach a parent-facing progress narrative. Checked
 * case-insensitively as substrings since the LLM may wrap them in surrounding prose.
 */
const BANNED_INTERNAL_TERMS = [
  "foil type",
  "foiltype",
  "mastery coefficient",
  "mastery score",
  "l1 transfer",
  "l1-transfer",
  "algorithm"
];

const FALLBACK_OVERALL_SUMMARY = "Your child is making progress with regular practice.";
const FALLBACK_ENCOURAGEMENT =
  "Keep encouraging short, regular practice sessions — consistency builds confidence.";

function containsBannedTerm(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_INTERNAL_TERMS.some((term) => lower.includes(term));
}

/**
 * Validates and sanitizes a candidate progress narrative before it can reach a parent.
 * `overallSummary` and `encouragement` are required by the wire contract, so a jargon
 * violation there is replaced with a safe generic fallback rather than removed; `strengths`
 * and `practiceAreas` are arrays the contract allows to be empty, so bad entries are simply
 * dropped. A `practiceArea` referencing a skill id outside `validSkillIds` is also dropped —
 * the LLM must only write about skills the deterministic layer actually flagged.
 */
export function filterProgressNarrative(
  candidate: ProgressNarrative,
  validSkillIds: ReadonlySet<string>
): ProgressNarrative {
  return {
    overallSummary: containsBannedTerm(candidate.overallSummary) ? FALLBACK_OVERALL_SUMMARY : candidate.overallSummary,
    strengths: candidate.strengths.filter((strength) => !containsBannedTerm(strength)),
    practiceAreas: candidate.practiceAreas.filter(
      (area) =>
        validSkillIds.has(area.skillId) &&
        !containsBannedTerm(area.title) &&
        !containsBannedTerm(area.description) &&
        !containsBannedTerm(area.suggestion)
    ),
    encouragement: containsBannedTerm(candidate.encouragement) ? FALLBACK_ENCOURAGEMENT : candidate.encouragement
  };
}
