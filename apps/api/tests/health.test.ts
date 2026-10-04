import { describe, expect, it } from "vitest";
import { createTestApp } from "./helpers.js";

describe("GET /health", () => {
  it("returns ok status", async () => {
    const app = await createTestApp();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", service: "ai-learning-engine" });
  });
});

describe("GET /health/ollama", () => {
  it("reports provider availability", async () => {
    const app = await createTestApp();
    const response = await app.inject({ method: "GET", url: "/health/ollama" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ available: true, model: "fake-model" });
  });
});
