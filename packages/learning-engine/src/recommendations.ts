import type { LearningEvent, SkillStats } from "@ale/shared";
import { computeSkillStats } from "./skillAnalysis.js";
import { calculateMastery } from "./mastery.js";
import { identifyDominantError, type DominantError } from "./errorAnalysis.js";

/**
 * Everything the AI layer is allowed to see for one learner/skill analysis request.
 * This is the hard boundary between deterministic analysis and AI interpretation:
 * the AI package only ever receives this bundle, never raw events or database rows.
 */
export interface SkillAnalysisBundle {
  stats: SkillStats;
  mastery: number;
  dominantError: DominantError | null;
}

export function buildSkillAnalysisBundle(events: LearningEvent[], skill: string): SkillAnalysisBundle {
  const stats = computeSkillStats(events, skill);
  const mastery = calculateMastery(stats);
  const dominantError = identifyDominantError(stats);
  return { stats, mastery, dominantError };
}
