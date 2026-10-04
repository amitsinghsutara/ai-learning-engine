import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createLearningEventSchema } from "@ale/shared";

/**
 * Compatibility ingestion endpoint for learning-game clients that speak their own
 * richer event envelope instead of this API's native `/learners/:id/events` shape
 * (see Forest Spelling Adventure, the reference client from the architecture
 * diagram). Accepts the client's envelope as-is, auto-provisions the learner by
 * the client-generated id if needed (the game never calls `POST /learners`
 * first), and maps it down to the same core `LearningEvent` the rest of the
 * system understands. `applicationId`/`eventType`/`eventId` are accepted but not
 * currently persisted — they exist for future multi-client/multi-event-type
 * support and are intentionally ignored for Phase 1.
 */
const gameEventEnvelopeSchema = z.object({
  eventId: z.string().optional(),
  learnerId: z.string().trim().min(1),
  applicationId: z.string().optional(),
  eventType: z.string().optional(),
  activity: z.object({
    levelId: z.string().optional(),
    puzzleId: z.string().optional(),
    skillId: z.string().trim().min(1),
    targetWord: z.string().trim().min(1)
  }),
  interaction: z.object({
    selectedAnswer: z.string().optional(),
    correct: z.boolean(),
    responseTimeMs: z.number().min(0).optional(),
    attemptNumber: z.number().int().min(1).optional()
  }),
  metadata: z.object({ foilType: z.string().optional(), difficulty: z.string().optional() }).passthrough().optional(),
  timestamp: z.string().datetime()
});

export async function ingestRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/events", async (request, reply) => {
    const envelope = gameEventEnvelopeSchema.parse(request.body);

    app.learnerService.ensureLearner(envelope.learnerId);

    const input = createLearningEventSchema.parse({
      skill: envelope.activity.skillId,
      target: envelope.activity.targetWord,
      selectedAnswer: envelope.interaction.selectedAnswer,
      correct: envelope.interaction.correct,
      foilType: envelope.metadata?.foilType,
      difficulty: envelope.metadata?.difficulty,
      responseTimeMs:
        envelope.interaction.responseTimeMs !== undefined
          ? Math.round(envelope.interaction.responseTimeMs)
          : undefined,
      attemptNumber: envelope.interaction.attemptNumber,
      timestamp: envelope.timestamp
    });

    const event = app.eventService.createEvent(envelope.learnerId, input);
    reply.status(201).send(event);
  });
}
