import type { LearningEvent, SkillStats } from "@ale/shared";
import { computeSkillStats, listSkills } from "./skillAnalysis.js";
import { calculateMastery } from "./mastery.js";

export interface SkillProfile {
  stats: SkillStats;
  mastery: number;
}

export interface LearnerProfile {
  skills: SkillProfile[];
  /** Simple (unweighted) average of per-skill mastery. 0 when the learner has no events. */
  overallMastery: number;
}

/** Builds a full deterministic profile (per-skill stats + mastery) from a learner's raw events. */
export function buildLearnerProfile(events: LearningEvent[]): LearnerProfile {
  const skills = listSkills(events).map((skill) => {
    const stats = computeSkillStats(events, skill);
    return { stats, mastery: calculateMastery(stats) };
  });

  const overallMastery =
    skills.length === 0
      ? 0
      : Math.round((skills.reduce((sum, s) => sum + s.mastery, 0) / skills.length) * 100) / 100;

  return { skills, overallMastery };
}

/** Returns the skill with the lowest mastery, or null if the learner has no events. */
export function identifyWeakestSkill(profile: LearnerProfile): SkillProfile | null {
  if (profile.skills.length === 0) return null;
  return profile.skills.reduce((weakest, current) =>
    current.mastery < weakest.mastery ? current : weakest
  );
}
