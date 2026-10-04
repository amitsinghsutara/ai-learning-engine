import type { FastifyInstance } from "fastify";
import { learnerIdParamSchema } from "@ale/shared";

export async function progressRoutes(app: FastifyInstance): Promise<void> {
  // Powers the game client's "Child's Progress" screen (see
  // docs/learning-events-api.md in the Forest Spelling Adventure repo). The game generates
  // and persists its own anonymous learner id client-side and may request this before any
  // event has synced successfully, so the learner is auto-provisioned here (mirroring
  // POST /api/v1/events) rather than 404ing — a brand new learner gets a friendly empty
  // summary instead.
  app.get("/api/v1/learners/:learnerId/progress", async (request) => {
    const { learnerId } = learnerIdParamSchema.parse(request.params);

    const learner = app.learnerService.ensureLearner(learnerId);
    const events = app.eventService.listEventsForLearner(learnerId);

    return app.analysisService.summarizeProgress(learner, events);
  });
}
