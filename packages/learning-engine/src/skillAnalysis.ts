import type { LearningEvent, SkillStats } from "@ale/shared";
import { RECENT_WINDOW_SIZE } from "@ale/shared";

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((total, value) => total + value, 0);
  return sum / values.length;
}

function accuracyOf(events: LearningEvent[]): number | null {
  if (events.length === 0) return null;
  const correct = events.filter((event) => event.correct).length;
  return correct / events.length;
}

/**
 * Computes deterministic, non-AI statistics for a single learner/skill pair.
 * Events are sorted chronologically so "recent" always means most-recently-attempted,
 * regardless of the order they were submitted to the API.
 */
export function computeSkillStats(
  events: LearningEvent[],
  skill: string,
  recentWindowSize: number = RECENT_WINDOW_SIZE
): SkillStats {
  const skillEvents = events
    .filter((event) => event.skill === skill)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const attempts = skillEvents.length;
  const correct = skillEvents.filter((event) => event.correct).length;
  const incorrect = attempts - correct;

  const foilErrors: Record<string, number> = {};
  for (const event of skillEvents) {
    if (!event.correct && event.foilType) {
      foilErrors[event.foilType] = (foilErrors[event.foilType] ?? 0) + 1;
    }
  }

  const recentEvents = skillEvents.slice(-recentWindowSize);
  const historicalEvents = skillEvents.slice(0, Math.max(0, attempts - recentWindowSize));

  return {
    skill,
    attempts,
    correct,
    incorrect,
    accuracy: attempts === 0 ? 0 : correct / attempts,
    averageResponseTimeMs: average(
      skillEvents
        .map((event) => event.responseTimeMs)
        .filter((value): value is number => typeof value === "number")
    ),
    foilErrors,
    recentAccuracy: accuracyOf(recentEvents),
    historicalAccuracy: accuracyOf(historicalEvents)
  };
}

/** Returns the distinct skill names present in a set of events, in first-seen order. */
export function listSkills(events: LearningEvent[]): string[] {
  const seen = new Set<string>();
  for (const event of events) seen.add(event.skill);
  return Array.from(seen);
}
