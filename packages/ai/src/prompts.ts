import type { PracticeGenerationInput, SkillAnalysisInput } from "./types.js";

const FOIL_TYPE_LABELS: Record<string, string> = {
  V: "Vowel substitution",
  IC: "Initial consonant substitution",
  FC: "Final consonant substitution"
};

function describeFoilErrors(foilErrors: Record<string, number>): string {
  const entries = Object.entries(foilErrors);
  if (entries.length === 0) return "None recorded.";
  return entries.map(([type, count]) => `${FOIL_TYPE_LABELS[type] ?? type}: ${count}`).join("\n");
}

function formatPercent(value: number | null): string {
  return value === null ? "Not enough data yet" : `${Math.round(value * 100)}%`;
}

/**
 * Builds the prompt sent to the LLM for a single learner/skill analysis.
 * Only the pre-digested, deterministic statistics are included — never raw
 * events or database contents.
 */
export function buildAnalysisPrompt(input: SkillAnalysisInput): string {
  return `You are an educational learning assistant.

Your job is to analyze structured learner performance and recommend appropriate practice.

You are NOT a medical or psychological diagnostic system. Do not diagnose learning
disabilities or make any clinical claims. Base your answer only on the data below.

Learner:
Age: ${input.learnerAge ?? "unknown"}

Skill:
${input.skill}

Performance:
Attempts: ${input.attempts}
Accuracy: ${formatPercent(input.accuracy)}
Mastery estimate: ${input.mastery}

Foil errors:
${describeFoilErrors(input.foilErrors)}

Recent accuracy:
${formatPercent(input.recentAccuracy)}

Historical accuracy:
${formatPercent(input.historicalAccuracy)}

Determine:
1. Primary skill difficulty (what specifically is hard for this learner right now)
2. Secondary difficulty, if any
3. Recommended practice focus
4. Recommended difficulty level (one of: beginner, easy, medium, advanced)
5. Number of practice items to recommend (1-20)
6. A short, learner-friendly hint (one sentence, encouraging, no jargon)
7. A brief explanation of your reasoning for a teacher/parent audience
8. A confidence score between 0 and 1 for this recommendation

Return JSON only, matching the provided schema exactly.`;
}

/**
 * Builds the prompt sent to the LLM to generate candidate practice items.
 * Generated items are candidates only — they must pass content validation
 * before being shown to a learner.
 */
export function buildPracticePrompt(input: PracticeGenerationInput): string {
  const avoid =
    input.recentTargets && input.recentTargets.length > 0
      ? `Avoid reusing these recent targets: ${input.recentTargets.join(", ")}.`
      : "";

  return `You are an educational content generator for early literacy and phonics practice.

Skill: ${input.skill}
Focus: ${input.focus}
Difficulty: ${input.difficulty}
Number of items to generate: ${input.practiceCount}
${avoid}

Each item must have:
- "target": a single real, age-appropriate word that matches the skill and focus
- "choices": an array of 3-4 words that MUST include the "target" word itself,
  plus 2-3 plausible but incorrect distractor words that test the same focus
  (e.g. a single differing letter/sound)

CRITICAL RULE: the "target" value must always appear, unchanged, as one of the
entries in its own "choices" array. This is the most common mistake — check it
for every item before responding.

Example of a correctly formed item (target "cat" appears in its own choices):
{"target": "cat", "choices": ["cat", "cot", "cut"]}

Example of an INCORRECT item (do not do this — "cat" is missing from choices):
{"target": "cat", "choices": ["cot", "cut", "can"]}

Other rules:
- Every word must be a real, simple, age-appropriate English word.
- Do not include any explicit, violent, or otherwise inappropriate content.
- Do not repeat the same target across items, and do not repeat a choice within
  the same item's choices array.
- Return JSON only, matching the provided schema exactly, with a "skill", "focus",
  and "items" array.`;
}
