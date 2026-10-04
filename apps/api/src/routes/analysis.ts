import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ERROR_CODES, learnerIdParamSchema } from "@ale/shared";
import { AppError } from "../lib/errors.js";

const analysisRequestSchema = z.object({
  skill: z.string().trim().min(1).optional()
});

export async function analysisRoutes(app: FastifyInstance): Promise<void> {
  app.post("/learners/:learnerId/analyze", async (request) => {
    const { learnerId } = learnerIdParamSchema.parse(request.params);
    const { skill } = analysisRequestSchema.parse(request.body ?? {});

    const learner = app.learnerService.getLearner(learnerId);
    if (!learner) {
      throw new AppError(ERROR_CODES.LEARNER_NOT_FOUND, `No learner found with id "${learnerId}".`, 404);
    }

    const events = app.eventService.listEventsForLearner(learnerId);
    return app.analysisService.analyzeLearner(learner, events, skill);
  });

  app.post("/learners/:learnerId/practice", async (request) => {
    const { learnerId } = learnerIdParamSchema.parse(request.params);
    const { skill } = analysisRequestSchema.parse(request.body ?? {});

    const learner = app.learnerService.getLearner(learnerId);
    if (!learner) {
      throw new AppError(ERROR_CODES.LEARNER_NOT_FOUND, `No learner found with id "${learnerId}".`, 404);
    }

    const events = app.eventService.listEventsForLearner(learnerId);
    return app.analysisService.generatePractice(learner, events, skill);
  });
}
