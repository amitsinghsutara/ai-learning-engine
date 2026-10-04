import type { FastifyInstance } from "fastify";
import { createLearningEventSchema, ERROR_CODES, learnerIdParamSchema } from "@ale/shared";
import { AppError } from "../lib/errors.js";

export async function eventRoutes(app: FastifyInstance): Promise<void> {
  app.post("/learners/:learnerId/events", async (request, reply) => {
    const { learnerId } = learnerIdParamSchema.parse(request.params);

    const learner = app.learnerService.getLearner(learnerId);
    if (!learner) {
      throw new AppError(ERROR_CODES.LEARNER_NOT_FOUND, `No learner found with id "${learnerId}".`, 404);
    }

    const input = createLearningEventSchema.parse(request.body);
    const event = app.eventService.createEvent(learnerId, input);
    reply.status(201).send(event);
  });
}
