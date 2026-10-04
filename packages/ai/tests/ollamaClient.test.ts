import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { OllamaProvider } from "../src/ollamaClient.js";
import { AIProviderError } from "../src/errors.js";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body
  } as Response;
}

const SCHEMA = z.object({ foo: z.string() });

describe("OllamaProvider.generateStructured", () => {
  it("returns parsed data when the first response is valid", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ response: JSON.stringify({ foo: "bar" }) }));
    const provider = new OllamaProvider({ baseUrl: "http://localhost:11434", model: "qwen3:8b", fetchImpl });
    const result = await provider.generateStructured("prompt", SCHEMA);
    expect(result).toEqual({ foo: "bar" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries once with a correction prompt when the first response is malformed JSON", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ response: "not json" }))
      .mockResolvedValueOnce(jsonResponse({ response: JSON.stringify({ foo: "bar" }) }));
    const provider = new OllamaProvider({ baseUrl: "http://localhost:11434", model: "qwen3:8b", fetchImpl });
    const result = await provider.generateStructured("prompt", SCHEMA);
    expect(result).toEqual({ foo: "bar" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("throws INVALID_AI_RESPONSE when both attempts fail validation", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ response: "still not json" }));
    const provider = new OllamaProvider({ baseUrl: "http://localhost:11434", model: "qwen3:8b", fetchImpl });
    await expect(provider.generateStructured("prompt", SCHEMA)).rejects.toMatchObject({
      code: "INVALID_AI_RESPONSE"
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("throws OLLAMA_UNAVAILABLE when the request fails outright", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const provider = new OllamaProvider({ baseUrl: "http://localhost:11434", model: "qwen3:8b", fetchImpl });
    await expect(provider.generateText("prompt")).rejects.toMatchObject({ code: "OLLAMA_UNAVAILABLE" });
  });

  it("throws OLLAMA_TIMEOUT when the request is aborted for taking too long", async () => {
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
    const provider = new OllamaProvider({
      baseUrl: "http://localhost:11434",
      model: "qwen3:8b",
      timeoutMs: 10,
      fetchImpl: fetchImpl as unknown as typeof fetch
    });
    await expect(provider.generateText("prompt")).rejects.toMatchObject({ code: "OLLAMA_TIMEOUT" });
  });

  it("throws AIProviderError instances (not generic errors)", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const provider = new OllamaProvider({ baseUrl: "http://localhost:11434", model: "qwen3:8b", fetchImpl });
    await expect(provider.generateText("prompt")).rejects.toBeInstanceOf(AIProviderError);
  });
});

describe("OllamaProvider.checkHealth", () => {
  it("reports available and installed when the model is present", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ models: [{ name: "qwen3:8b", model: "qwen3:8b" }] })
    );
    const provider = new OllamaProvider({ baseUrl: "http://localhost:11434", model: "qwen3:8b", fetchImpl });
    const health = await provider.checkHealth();
    expect(health).toEqual({ available: true, model: "qwen3:8b", modelInstalled: true });
  });

  it("reports unavailable when Ollama cannot be reached", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const provider = new OllamaProvider({ baseUrl: "http://localhost:11434", model: "qwen3:8b", fetchImpl });
    const health = await provider.checkHealth();
    expect(health.available).toBe(false);
  });

  it("reports available but not installed when the model is missing", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ models: [{ name: "llama3", model: "llama3" }] }));
    const provider = new OllamaProvider({ baseUrl: "http://localhost:11434", model: "qwen3:8b", fetchImpl });
    const health = await provider.checkHealth();
    expect(health).toEqual({ available: true, model: "qwen3:8b", modelInstalled: false });
  });
});
