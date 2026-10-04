import type { SkillStats } from "@ale/shared";
import { identifyDominantError } from "./errorAnalysis.js";

/**
 * Deterministic mastery formula. The LLM never calculates this number — it may
 * only interpret it. Mastery is a weighted blend of four signals, each already
 * expressed on a 0..1 scale:
 *
 *   mastery = 0.40 * overallAccuracy
 *           + 0.35 * recencyScore
 *           + 0.15 * consistencyScore
 *           + 0.10 * errorPatternScore
 *
 * - overallAccuracy: correct / attempts across all history for the skill.
 * - recencyScore: accuracy over the most recent window of events (falls back to
 *   overallAccuracy when there isn't a distinct recent window yet). Weighted
 *   second-highest because recent performance best predicts current ability.
 * - consistencyScore: 1 - |recentAccuracy - historicalAccuracy|. A learner whose
 *   recent performance closely matches their historical performance is scored as
 *   consistent (1.0); a big swing in either direction lowers this score. Defaults
 *   to 1.0 when there isn't enough history to compare against yet, so new learners
 *   aren't penalized for lack of data.
 * - errorPatternScore: 1 - (share of incorrect answers attributable to the single
 *   most common foil type). A learner who misses questions for many different
 *   reasons scores higher here than one stuck on one specific misconception
 *   (e.g. consistently confusing short vowels), since a concentrated error
 *   pattern indicates an unresolved, specific gap. Defaults to 1.0 when there are
 *   no recorded errors.
 *
 * The result is clamped to [0, 1] and rounded to 2 decimal places. A skill with
 * zero attempts, or zero correct answers, has a mastery of 0 — consistency and
 * error-pattern signals are only meaningful once there is at least some evidence
 * of competence to weigh them against.
 */
export function calculateMastery(stats: SkillStats): number {
  if (stats.attempts === 0 || stats.correct === 0) return 0;

  const overallAccuracy = stats.accuracy;
  const recencyScore = stats.recentAccuracy ?? overallAccuracy;

  const consistencyScore =
    stats.recentAccuracy !== null && stats.historicalAccuracy !== null
      ? 1 - Math.abs(stats.recentAccuracy - stats.historicalAccuracy)
      : 1;

  const dominantError = identifyDominantError(stats);
  const errorPatternScore = dominantError ? 1 - dominantError.share : 1;

  const mastery =
    0.4 * overallAccuracy + 0.35 * recencyScore + 0.15 * consistencyScore + 0.1 * errorPatternScore;

  const clamped = Math.min(1, Math.max(0, mastery));
  return Math.round(clamped * 100) / 100;
}
