import { describe, expect, it } from "vitest";
import { createTestApp } from "./helpers.js";

describe("POST /learners", () => {
  it("creates an anonymous learner with no body", async () => {
    const app = await createTestApp();
    const response = await app.inject({ method: "POST", url: "/learners", payload: {} });
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBeTruthy();
    expect(body.displayName).toBeUndefined();
  });

  it("creates a learner with optional displayName and age", async () => {
    const app = await createTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/learners",
      payload: { displayName: "Demo Learner", age: 6 }
    });
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.displayName).toBe("Demo Learner");
    expect(body.age).toBe(6);
  });

  it("rejects an invalid age", async () => {
    const app = await createTestApp();
    const response = await app.inject({ method: "POST", url: "/learners", payload: { age: 200 } });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /learners/:learnerId", () => {
  it("returns a previously created learner", async () => {
    const app = await createTestApp();
    const created = await app.inject({ method: "POST", url: "/learners", payload: {} });
    const { id } = created.json();

    const response = await app.inject({ method: "GET", url: `/learners/${id}` });
    expect(response.statusCode).toBe(200);
    expect(response.json().id).toBe(id);
  });

  it("returns 404 for an unknown learner id", async () => {
    const app = await createTestApp();
    const response = await app.inject({ method: "GET", url: "/learners/does-not-exist" });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("LEARNER_NOT_FOUND");
  });
});

describe("GET /learners/:learnerId/profile", () => {
  it("returns a deterministic per-skill mastery breakdown without calling the AI provider", async () => {
    const app = await createTestApp();
    const created = await app.inject({ method: "POST", url: "/learners", payload: {} });
    const { id } = created.json();

    await app.inject({
      method: "POST",
      url: `/learners/${id}/events`,
      payload: { skill: "initial-sounds", target: "ball", correct: true }
    });

    const response = await app.inject({ method: "GET", url: `/learners/${id}/profile` });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.skills).toHaveLength(1);
    expect(body.skills[0].stats.skill).toBe("initial-sounds");
    expect(body.overallMastery).toBeGreaterThanOrEqual(0);
  });

  it("returns an empty profile (not 404) for a learner with no events yet", async () => {
    const app = await createTestApp();
    const created = await app.inject({ method: "POST", url: "/learners", payload: {} });
    const { id } = created.json();

    const response = await app.inject({ method: "GET", url: `/learners/${id}/profile` });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ skills: [], overallMastery: 0 });
  });

  it("returns 404 for an unknown learner", async () => {
    const app = await createTestApp();
    const response = await app.inject({ method: "GET", url: "/learners/does-not-exist/profile" });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("LEARNER_NOT_FOUND");
  });
});
