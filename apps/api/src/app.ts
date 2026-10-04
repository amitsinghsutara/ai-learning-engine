import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import type { DatabaseSync } from "node:sqlite";
import { ERROR_CODES } from "@ale/shared";
import type { LLMProvider } from "@ale/ai";
import { AIProviderError } from "@ale/ai";
import { AppError } from "./lib/errors.js";
import { LearnerService } from "./services/learnerService.js";
import { EventService } from "./services/eventService.js";
import { AnalysisService } from "./services/analysisService.js";
import { healthRoutes } from "./routes/health.js";
import { learnerRoutes } from "./routes/learners.js";
import { eventRoutes } from "./routes/events.js";
import { analysisRoutes } from "./routes/analysis.js";

declare module "fastify" {
  interface FastifyInstance {
    learnerService: LearnerService;
    eventService: EventService;
    analysisService: AnalysisService;
    aiProvider: LLMProvider;
  }
}

export interface BuildAppOptions {
  db: DatabaseSync;
  provider: LLMProvider;
  logger?: boolean;
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? false });

  app.decorate("learnerService", new LearnerService(options.db));
  app.decorate("eventService", new EventService(options.db));
  app.decorate("analysisService", new AnalysisService(options.provider));
  app.decorate("aiProvider", options.provider);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({ error: { code: error.code, message: error.message } });
      return;
    }

    if (error instanceof AIProviderError) {
      const statusByCode: Record<string, number> = {
        [ERROR_CODES.OLLAMA_UNAVAILABLE]: 503,
        [ERROR_CODES.OLLAMA_TIMEOUT]: 504,
        [ERROR_CODES.INVALID_AI_RESPONSE]: 502
      };
      reply
        .status(statusByCode[error.code] ?? 502)
        .send({ error: { code: error.code, message: error.message } });
      return;
    }

    if (error instanceof ZodError) {
      reply.status(400).send({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join("; ")
        }
      });
      return;
    }

    app.log.error(error);
    reply.status(500).send({
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An unexpected error occurred." }
    });
  });

  app.register(healthRoutes);
  app.register(learnerRoutes);
  app.register(eventRoutes);
  app.register(analysisRoutes);

  return app;
}
