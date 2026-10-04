import type { FastifyInstance } from "fastify";
import { buildLearnerProfile } from "@ale/learning-engine";
import { createLearnerSchema, ERROR_CODES, learnerIdParamSchema } from "@ale/shared";
import { AppError } from "../lib/errors.js";

export async function learnerRoutes(app: FastifyInstance): Promise<void> {
  app.post("/learners", async (request, reply) => {
    const input = createLearnerSchema.parse(request.body ?? {});
    const learner = app.learnerService.createLearner(input);
    reply.status(201).send(learner);
  });

  app.get("/learners/:learnerId", async (request) => {
    const { learnerId } = learnerIdParamSchema.parse(request.params);
    const learner = app.learnerService.getLearner(learnerId);
    if (!learner) {
      throw new AppError(ERROR_CODES.LEARNER_NOT_FOUND, `No learner found with id "${learnerId}".`, 404);
    }
    return learner;
  });

  // Deterministic, AI-free per-skill mastery breakdown for dashboards. Unlike
  // /analyze, this never calls the LLM — it's the "Deterministic First" data.
  app.get("/learners/:learnerId/profile", async (request) => {
    const { learnerId } = learnerIdParamSchema.parse(request.params);
    const learner = app.learnerService.getLearner(learnerId);
    if (!learner) {
      throw new AppError(ERROR_CODES.LEARNER_NOT_FOUND, `No learner found with id "${learnerId}".`, 404);
    }

    const events = app.eventService.listEventsForLearner(learnerId);
    return buildLearnerProfile(events);
  });
}
