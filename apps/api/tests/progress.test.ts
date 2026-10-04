import { describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "./helpers.js";

async function createLearnerWithEvents(app: FastifyInstance) {
  const created = await app.inject({ method: "POST", url: "/learners", payload: { age: 6 } });
  const learnerId = created.json().id as string;

  const events = [
    { skill: "short-vowels", target: "cat", correct: false, foilType: "V", attemptNumber: 1 },
    { skill: "short-vowels", target: "pet", correct: false, foilType: "V", attemptNumber: 1 },
    { skill: "short-vowels", target: "sit", correct: false, foilType: "V", attemptNumber: 1 },
    { skill: "initial-sounds", target: "ball", correct: true, attemptNumber: 1 },
    { skill: "initial-sounds", target: "fish", correct: true, attemptNumber: 1 },
    { skill: "initial-sounds", target: "dog", correct: true, attemptNumber: 1 }
  ];

  for (const event of events) {
    await app.inject({ method: "POST", url: `/learners/${learnerId}/events`, payload: event });
  }

  return learnerId;
}

describe("GET /api/v1/learners/:learnerId/progress", () => {
  it("returns a validated progress summary for a learner with events", async () => {
    const app = await createTestApp();
    const learnerId = await createLearnerWithEvents(app);

    const response = await app.inject({ method: "GET", url: `/api/v1/learners/${learnerId}/progress` });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.learnerId).toBe(learnerId);
    expect(typeof body.generatedAt).toBe("string");
    expect(body.overall.mastery).toBeGreaterThanOrEqual(0);
    expect(["improving", "stable", "needs-practice"]).toContain(body.overall.trend);
    expect(body.skills.length).toBe(2);
    expect(body.strengths.length).toBeGreaterThan(0);
    expect(body.practiceAreas[0].skillId).toBe("short-vowels");
    expect(body.encouragement).toBeTruthy();
  });

  it("auto-provisions an unknown learner and returns a friendly empty summary instead of 404ing", async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/learners/brand-new-learner-id/progress"
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.learnerId).toBe("brand-new-learner-id");
    expect(body.overall.mastery).toBe(0);
    expect(body.skills).toEqual([]);
    expect(body.strengths).toEqual([]);
    expect(body.practiceAreas).toEqual([]);
    expect(body.encouragement).toBeTruthy();
  });

  it("returns an empty summary for a known learner with no events yet, without calling the AI provider", async () => {
    const app = await createTestApp();
    const created = await app.inject({ method: "POST", url: "/learners", payload: {} });
    const learnerId = created.json().id;

    const response = await app.inject({ method: "GET", url: `/api/v1/learners/${learnerId}/progress` });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.skills).toEqual([]);
  });
});
