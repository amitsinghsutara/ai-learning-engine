import type { LearningEvent, ProgressTrend } from "@ale/shared";
import { buildLearnerProfile, type SkillProfile } from "./learnerProfile.js";

const STRONG_MASTERY_THRESHOLD = 0.85;
const NEEDS_PRACTICE_MASTERY_THRESHOLD = 0.5;
const IMPROVING_ACCURACY_DELTA_THRESHOLD = 0.1;

/**
 * A skill needs at least this many attempts before its mastery/trend is trusted enough to
 * call out as a strength or a practice area — one lucky or unlucky attempt shouldn't drive
 * a parent-facing claim.
 */
const MIN_ATTEMPTS_FOR_CALLOUT = 3;

/** At most this many skills are called out as strengths or practice areas, strongest/weakest first. */
const MAX_CALLOUTS = 3;

/** One skill's deterministic mastery/trend/attempt-count, the input to progress narration. */
export interface SkillProgressProfile {
  id: string;
  name: string;
  mastery: number;
  trend: string;
  attempts: number;
}

/**
 * Everything the AI layer is allowed to see to write a progress narrative. Like
 * `SkillAnalysisBundle`, this is the hard boundary between deterministic analysis and AI
 * interpretation — the AI package only ever receives this bundle, never raw events.
 */
export interface ProgressSummaryBundle {
  overallMastery: number;
  overallTrend: ProgressTrend;
  skills: SkillProgressProfile[];
  /** Skill ids with enough attempts and high, stable mastery, strongest first (max 3). */
  strongSkillIds: string[];
  /** Skill ids with enough attempts and low mastery, weakest first (max 3). */
  weakSkillIds: string[];
}

/** Turns a slugified skill id (e.g. "cvc-short-vowels") into a human-readable label ("Cvc Short Vowels"). */
export function humanizeSkillId(id: string): string {
  return id
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Classifies a single skill's trend from its deterministic stats. Returned as a plain string
 * (not the restricted `ProgressTrend` union) because skill-level trend is presentational and
 * intentionally more descriptive than the three overall-trend values — e.g. "strong" is a
 * meaningful distinction from "improving" at the skill level that the overall trend collapses.
 */
export function classifySkillTrend(skill: SkillProfile): string {
  const { stats, mastery } = skill;

  if (stats.attempts < MIN_ATTEMPTS_FOR_CALLOUT) return "stable";
  if (mastery >= STRONG_MASTERY_THRESHOLD) return "strong";

  if (
    stats.recentAccuracy !== null &&
    stats.historicalAccuracy !== null &&
    stats.recentAccuracy - stats.historicalAccuracy >= IMPROVING_ACCURACY_DELTA_THRESHOLD
  ) {
    return "improving";
  }

  if (mastery < NEEDS_PRACTICE_MASTERY_THRESHOLD) return "needs-practice";
  return "stable";
}

/** Derives the single overall trend from per-skill trends: majority-needs-practice wins, then any improvement. */
export function classifyOverallTrend(skills: SkillProgressProfile[]): ProgressTrend {
  if (skills.length === 0) return "stable";

  const needsPracticeCount = skills.filter((skill) => skill.trend === "needs-practice").length;
  const improvingCount = skills.filter((skill) => skill.trend === "improving").length;

  if (needsPracticeCount > skills.length / 2) return "needs-practice";
  if (improvingCount > 0 && needsPracticeCount === 0) return "improving";
  return "stable";
}

/** Builds the deterministic bundle a progress-summary request hands to the AI layer. */
export function buildProgressSummaryBundle(events: LearningEvent[]): ProgressSummaryBundle {
  const profile = buildLearnerProfile(events);

  const skills: SkillProgressProfile[] = profile.skills.map((skill) => ({
    id: skill.stats.skill,
    name: humanizeSkillId(skill.stats.skill),
    mastery: skill.mastery,
    trend: classifySkillTrend(skill),
    attempts: skill.stats.attempts
  }));

  const eligible = skills.filter((skill) => skill.attempts >= MIN_ATTEMPTS_FOR_CALLOUT);

  const strongSkillIds = eligible
    .filter((skill) => skill.trend === "strong")
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, MAX_CALLOUTS)
    .map((skill) => skill.id);

  const weakSkillIds = eligible
    .filter((skill) => skill.trend === "needs-practice")
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, MAX_CALLOUTS)
    .map((skill) => skill.id);

  return {
    overallMastery: profile.overallMastery,
    overallTrend: classifyOverallTrend(skills),
    skills,
    strongSkillIds,
    weakSkillIds
  };
}
