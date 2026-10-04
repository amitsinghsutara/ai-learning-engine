import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";
import type { FastifyInstance } from "fastify";
import type { LLMProvider } from "@ale/ai";
import { AIProviderError } from "@ale/ai";
import { ERROR_CODES } from "@ale/shared";
import { createTestApp } from "./helpers.js";

async function createLearnerWithEvents(app: FastifyInstance) {
  const created = await app.inject({ method: "POST", url: "/learners", payload: { age: 6 } });
  const learnerId = created.json().id as string;

  const events = [
    { skill: "short-vowels", target: "cat", correct: false, foilType: "V", attemptNumber: 1 },
    { skill: "short-vowels", target: "pet", correct: false, foilType: "V", attemptNumber: 1 },
    { skill: "short-vowels", target: "sit", correct: true, attemptNumber: 1 },
    { skill: "initial-sounds", target: "ball", correct: true, attemptNumber: 1 },
    { skill: "initial-sounds", target: "fish", correct: true, attemptNumber: 1 }
  ];

  for (const event of events) {
    await app.inject({ method: "POST", url: `/learners/${learnerId}/events`, payload: event });
  }

  return learnerId;
}

describe("POST /learners/:learnerId/analyze", () => {
  it("returns a validated recommendation for the weakest skill when none is specified", async () => {
    const app = await createTestApp();
    const learnerId = await createLearnerWithEvents(app);

    const response = await app.inject({ method: "POST", url: `/learners/${learnerId}/analyze`, payload: {} });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.skill).toBe("short-vowels");
    expect(body.mastery).toBeGreaterThanOrEqual(0);
    expect(body.recommendation.focus).toBeTruthy();
    expect(body.recommendation.difficulty).toBe("easy");
  });

  it("returns 404 when the learner has no events", async () => {
    const app = await createTestApp();
    const created = await app.inject({ method: "POST", url: "/learners", payload: {} });
    const learnerId = created.json().id;

    const response = await app.inject({ method: "POST", url: `/learners/${learnerId}/analyze`, payload: {} });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("NO_EVENTS_FOUND");
  });

  it("returns 404 for an unknown learner", async () => {
    const app = await createTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/learners/does-not-exist/analyze",
      payload: {}
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("LEARNER_NOT_FOUND");
  });

  it("maps an unavailable AI provider to a 503 without leaking internals", async () => {
    const unavailableProvider: LLMProvider = {
      generateText: async () => {
        throw new AIProviderError(ERROR_CODES.OLLAMA_UNAVAILABLE, "The local AI service is currently unavailable.");
      },
      generateStructured: async <T>(_prompt: string, _schema: ZodType<T>): Promise<T> => {
        throw new AIProviderError(ERROR_CODES.OLLAMA_UNAVAILABLE, "The local AI service is currently unavailable.");
      }
    };
    const app = await createTestApp(unavailableProvider);
    const learnerId = await createLearnerWithEvents(app);

    const response = await app.inject({ method: "POST", url: `/learners/${learnerId}/analyze`, payload: {} });

    expect(response.statusCode).toBe(503);
    const body = response.json();
    expect(body.error.code).toBe("OLLAMA_UNAVAILABLE");
    expect(body.error).not.toHaveProperty("stack");
  });
});

describe("POST /learners/:learnerId/practice", () => {
  it("returns content-validated practice items", async () => {
    const app = await createTestApp();
    const learnerId = await createLearnerWithEvents(app);

    const response = await app.inject({ method: "POST", url: `/learners/${learnerId}/practice`, payload: {} });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.items.length).toBeGreaterThan(0);
    for (const item of body.items) {
      expect(item.choices).toContain(item.target);
    }
  });
});
