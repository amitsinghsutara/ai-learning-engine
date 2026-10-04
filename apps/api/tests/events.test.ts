import { describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "./helpers.js";

async function createLearner(app: FastifyInstance) {
  const response = await app.inject({ method: "POST", url: "/learners", payload: {} });
  return response.json().id as string;
}

const VALID_EVENT = {
  skill: "short-vowels",
  target: "cat",
  selectedAnswer: "cit",
  correct: false,
  foilType: "V",
  difficulty: "beginner",
  responseTimeMs: 4200,
  attemptNumber: 1
};

describe("POST /learners/:learnerId/events", () => {
  it("accepts a valid event for an existing learner", async () => {
    const app = await createTestApp();
    const learnerId = await createLearner(app);

    const response = await app.inject({
      method: "POST",
      url: `/learners/${learnerId}/events`,
      payload: VALID_EVENT
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.skill).toBe("short-vowels");
    expect(body.correct).toBe(false);
    expect(body.learnerId).toBe(learnerId);
  });

  it("rejects a malformed event (missing required fields)", async () => {
    const app = await createTestApp();
    const learnerId = await createLearner(app);

    const response = await app.inject({
      method: "POST",
      url: `/learners/${learnerId}/events`,
      payload: { skill: "short-vowels" }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when the learner does not exist", async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/learners/does-not-exist/events",
      payload: VALID_EVENT
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("LEARNER_NOT_FOUND");
  });
});
