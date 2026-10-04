import type { SkillStats } from "@ale/shared";

export interface DominantError {
  foilType: string;
  count: number;
  /** Fraction of all incorrect answers attributable to this foil type. */
  share: number;
}

/**
 * Finds the most common error/foil type for a skill, if any errors were recorded.
 * Ties are broken by first-insertion order of `foilErrors`.
 */
export function identifyDominantError(stats: SkillStats): DominantError | null {
  const entries = Object.entries(stats.foilErrors);
  if (entries.length === 0 || stats.incorrect === 0) return null;

  const [foilType, count] = entries.reduce((max, entry) => (entry[1] > max[1] ? entry : max));

  return {
    foilType,
    count,
    share: count / stats.incorrect
  };
}
