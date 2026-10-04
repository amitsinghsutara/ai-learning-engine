import { describe, expect, it } from "vitest";
import { createTestApp } from "./helpers.js";

// Shape actually sent by the Forest Spelling Adventure reference client.
function gameEvent(overrides: Record<string, unknown> = {}) {
  return {
    eventId: "f3bdd5af-f90a-49ad-bea3-f6ab9bd13233",
    learnerId: "c99e77bb-b454-4da9-94bc-893c3526f2a0",
    applicationId: "forest-spelling-adventure",
    eventType: "answer_submitted",
    activity: {
      levelId: "level-1",
      puzzleId: "level-1-puzzle-2",
      skillId: "cvc-short-vowels",
      targetWord: "pin"
    },
    interaction: {
      selectedAnswer: "pit",
      correct: false,
      responseTimeMs: 6193.5,
      attemptNumber: 1
    },
    metadata: { foilType: "FC" },
    timestamp: "2026-10-04T15:36:05.505Z",
    ...overrides
  };
}

describe("POST /api/v1/events", () => {
  it("accepts the game's envelope, auto-creating the learner if unknown", async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      payload: gameEvent()
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.skill).toBe("cvc-short-vowels");
    expect(body.target).toBe("pin");
    expect(body.correct).toBe(false);
    expect(body.foilType).toBe("FC");
    expect(body.responseTimeMs).toBe(6194); // rounded from 6193.5

    const learner = await app.inject({
      method: "GET",
      url: "/learners/c99e77bb-b454-4da9-94bc-893c3526f2a0"
    });
    expect(learner.statusCode).toBe(200);
  });

  it("reuses an already-known learner instead of erroring or duplicating", async () => {
    const app = await createTestApp();
    await app.inject({ method: "POST", url: "/api/v1/events", payload: gameEvent() });
    const second = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      payload: gameEvent({ eventId: "another-event-id" })
    });
    expect(second.statusCode).toBe(201);

    const profile = await app.inject({
      method: "GET",
      url: "/learners/c99e77bb-b454-4da9-94bc-893c3526f2a0/profile"
    });
    expect(profile.json().skills[0].stats.attempts).toBe(2);
  });

  it("rejects an envelope missing required activity fields", async () => {
    const app = await createTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      payload: gameEvent({ activity: { skillId: "cvc-short-vowels" } })
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("responds to a CORS preflight for a cross-origin game client", async () => {
    const app = await createTestApp();
    const response = await app.inject({
      method: "OPTIONS",
      url: "/api/v1/events",
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "POST"
      }
    });
    expect(response.statusCode).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });
});
