import { buildLearnerProfile, buildSkillAnalysisBundle, identifyWeakestSkill } from "@ale/learning-engine";
import { analyzeLearnerSkill, generatePracticeItems } from "@ale/ai";
import type { LLMProvider, SkillAnalysisInput } from "@ale/ai";
import { ERROR_CODES, type Learner, type LearningEvent, type LearningRecommendation, type PracticeSet, type SkillStats } from "@ale/shared";
import { AppError } from "../lib/errors.js";

export interface AnalysisResult {
  skill: string;
  stats: SkillStats;
  mastery: number;
  recommendation: LearningRecommendation;
}

/**
 * Orchestrates the deterministic learning engine and the AI layer. This is the
 * only place in the API that is allowed to call the AI package, and the only
 * data it ever forwards to the AI is the already-computed statistics bundle —
 * never raw events or database rows.
 */
export class AnalysisService {
  constructor(private readonly provider: LLMProvider) {}

  async analyzeLearner(learner: Learner, events: LearningEvent[], requestedSkill?: string): Promise<AnalysisResult> {
    const skill = this.resolveTargetSkill(events, requestedSkill);
    const bundle = buildSkillAnalysisBundle(events, skill);

    const input: SkillAnalysisInput = {
      learnerAge: learner.age,
      skill: bundle.stats.skill,
      attempts: bundle.stats.attempts,
      accuracy: bundle.stats.accuracy,
      mastery: bundle.mastery,
      averageResponseTimeMs: bundle.stats.averageResponseTimeMs,
      foilErrors: bundle.stats.foilErrors,
      recentAccuracy: bundle.stats.recentAccuracy,
      historicalAccuracy: bundle.stats.historicalAccuracy
    };

    const recommendation = await analyzeLearnerSkill(this.provider, input);

    return { skill: bundle.stats.skill, stats: bundle.stats, mastery: bundle.mastery, recommendation };
  }

  async generatePractice(learner: Learner, events: LearningEvent[], requestedSkill?: string): Promise<PracticeSet> {
    const analysis = await this.analyzeLearner(learner, events, requestedSkill);

    return generatePracticeItems(this.provider, {
      skill: analysis.skill,
      focus: analysis.recommendation.focus,
      difficulty: analysis.recommendation.difficulty,
      practiceCount: analysis.recommendation.practiceCount
    });
  }

  private resolveTargetSkill(events: LearningEvent[], requestedSkill?: string): string {
    if (events.length === 0) {
      throw new AppError(ERROR_CODES.NO_EVENTS_FOUND, "This learner has no recorded learning events yet.", 404);
    }

    if (requestedSkill) {
      const hasSkill = events.some((event) => event.skill === requestedSkill);
      if (!hasSkill) {
        throw new AppError(
          ERROR_CODES.NO_EVENTS_FOUND,
          `No events found for skill "${requestedSkill}".`,
          404
        );
      }
      return requestedSkill;
    }

    const profile = buildLearnerProfile(events);
    const weakest = identifyWeakestSkill(profile);
    // profile.skills can only be empty when events is empty, already handled above.
    return weakest!.stats.skill;
  }
}
