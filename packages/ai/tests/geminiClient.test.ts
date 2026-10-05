import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { GeminiProvider } from "../src/geminiClient.js";
import { AIProviderError } from "../src/errors.js";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body
  } as Response;
}

function geminiBody(text: string): unknown {
  return { candidates: [{ content: { parts: [{ text }] } }] };
}

const SCHEMA = z.object({ foo: z.string() });

describe("GeminiProvider.generateStructured", () => {
  it("returns parsed data when the first response is valid", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(geminiBody(JSON.stringify({ foo: "bar" }))));
    const provider = new GeminiProvider({ apiKey: "test-key", model: "gemini-flash-lite-latest", fetchImpl });
    const result = await provider.generateStructured("prompt", SCHEMA);
    expect(result).toEqual({ foo: "bar" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries once with a correction prompt when the first response is malformed JSON", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(geminiBody("not json")))
      .mockResolvedValueOnce(jsonResponse(geminiBody(JSON.stringify({ foo: "bar" }))));
    const provider = new GeminiProvider({ apiKey: "test-key", model: "gemini-flash-lite-latest", fetchImpl });
    const result = await provider.generateStructured("prompt", SCHEMA);
    expect(result).toEqual({ foo: "bar" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("throws INVALID_AI_RESPONSE when both attempts fail validation", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(geminiBody("still not json")));
    const provider = new GeminiProvider({ apiKey: "test-key", model: "gemini-flash-lite-latest", fetchImpl });
    await expect(provider.generateStructured("prompt", SCHEMA)).rejects.toMatchObject({
      code: "INVALID_AI_RESPONSE"
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("throws GEMINI_UNAVAILABLE when the request fails outright", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const provider = new GeminiProvider({ apiKey: "test-key", model: "gemini-flash-lite-latest", fetchImpl });
    await expect(provider.generateText("prompt")).rejects.toMatchObject({ code: "GEMINI_UNAVAILABLE" });
  });

  it("throws GEMINI_UNAVAILABLE when Gemini responds with a non-OK status", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, false, 429));
    const provider = new GeminiProvider({ apiKey: "test-key", model: "gemini-flash-lite-latest", fetchImpl });
    await expect(provider.generateText("prompt")).rejects.toMatchObject({ code: "GEMINI_UNAVAILABLE" });
  });

  it("throws GEMINI_TIMEOUT when the request is aborted for taking too long", async () => {
    const fetchImpl = vi.fn().mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        })
    );
    const provider = new GeminiProvider({
      apiKey: "test-key",
      model: "gemini-flash-lite-latest",
      timeoutMs: 10,
      fetchImpl: fetchImpl as unknown as typeof fetch
    });
    await expect(provider.generateText("prompt")).rejects.toMatchObject({ code: "GEMINI_TIMEOUT" });
  });

  it("throws AIProviderError instances (not generic errors)", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const provider = new GeminiProvider({ apiKey: "test-key", model: "gemini-flash-lite-latest", fetchImpl });
    await expect(provider.generateText("prompt")).rejects.toBeInstanceOf(AIProviderError);
  });
});

describe("GeminiProvider.checkHealth", () => {
  it("reports available when the model endpoint responds OK", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ name: "models/gemini-flash-lite-latest" }));
    const provider = new GeminiProvider({ apiKey: "test-key", model: "gemini-flash-lite-latest", fetchImpl });
    const health = await provider.checkHealth();
    expect(health).toEqual({ available: true, model: "gemini-flash-lite-latest" });
  });

  it("reports unavailable when Gemini cannot be reached", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const provider = new GeminiProvider({ apiKey: "test-key", model: "gemini-flash-lite-latest", fetchImpl });
    const health = await provider.checkHealth();
    expect(health.available).toBe(false);
  });

  it("reports unavailable when the model endpoint responds with an error status", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, false, 404));
    const provider = new GeminiProvider({ apiKey: "test-key", model: "gemini-flash-lite-latest", fetchImpl });
    const health = await provider.checkHealth();
    expect(health.available).toBe(false);
  });
});
