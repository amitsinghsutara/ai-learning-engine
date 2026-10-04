import type { ZodType } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ERROR_CODES } from "@ale/shared";
import type { LLMProvider } from "./provider.js";
import { AIProviderError } from "./errors.js";

export interface OllamaProviderOptions {
  baseUrl: string;
  model: string;
  /** Milliseconds to wait for a response before treating the request as timed out. */
  timeoutMs?: number;
  /** Injectable for testing; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

interface OllamaGenerateResponse {
  response: string;
}

interface OllamaTagsResponse {
  models: Array<{ name: string; model: string }>;
}

// Generous default: CPU-only local inference of multi-item structured JSON
// (e.g. a full practice set) can legitimately take well over a minute on
// modest hardware. Tune via OllamaProviderOptions.timeoutMs if needed.
const DEFAULT_TIMEOUT_MS = 180_000;

function buildCorrectionPrompt(originalPrompt: string, badResponse: string, issue: string): string {
  return [
    originalPrompt,
    "",
    "Your previous response could not be used because it was not valid JSON matching the required schema.",
    `Previous response:\n${badResponse}`,
    `Problem: ${issue}`,
    "Return ONLY corrected JSON that matches the schema. Do not include any explanation or markdown formatting."
  ].join("\n");
}

/** LLMProvider backed by a locally running Ollama instance. */
export class OllamaProvider implements LLMProvider {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OllamaProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.model = options.model;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generateText(prompt: string): Promise<string> {
    const result = await this.callGenerate({ prompt });
    return result.response;
  }

  async generateStructured<T>(prompt: string, schema: ZodType<T>): Promise<T> {
    const jsonSchema = zodToJsonSchema(schema, { target: "jsonSchema7", $refStrategy: "none" });

    const first = await this.callGenerate({ prompt, format: jsonSchema });
    const firstResult = this.validate(schema, first.response);
    if (firstResult.success) return firstResult.data;

    const retryPrompt = buildCorrectionPrompt(prompt, first.response, firstResult.issue);
    const second = await this.callGenerate({ prompt: retryPrompt, format: jsonSchema });
    const secondResult = this.validate(schema, second.response);
    if (secondResult.success) return secondResult.data;

    throw new AIProviderError(
      ERROR_CODES.INVALID_AI_RESPONSE,
      "The local AI model did not return a response matching the expected format, even after a retry."
    );
  }

  async checkHealth(): Promise<{ available: boolean; model: string; modelInstalled: boolean }> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/tags`, { method: "GET" });
      if (!response.ok) {
        return { available: false, model: this.model, modelInstalled: false };
      }
      const body = (await response.json()) as OllamaTagsResponse;
      const modelInstalled = body.models.some((m) => m.name === this.model || m.model === this.model);
      return { available: true, model: this.model, modelInstalled };
    } catch {
      return { available: false, model: this.model, modelInstalled: false };
    }
  }

  private validate<T>(
    schema: ZodType<T>,
    rawText: string
  ): { success: true; data: T } | { success: false; issue: string } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return { success: false, issue: "Response was not valid JSON." };
    }

    const result = schema.safeParse(parsed);
    if (result.success) return { success: true, data: result.data };
    return { success: false, issue: result.error.issues.map((i) => i.message).join("; ") };
  }

  private async callGenerate(body: { prompt: string; format?: unknown }): Promise<OllamaGenerateResponse> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: body.prompt,
        stream: false,
        // qwen3 is a hybrid reasoning model; we want fast, final structured JSON
        // for application logic, not a visible chain-of-thought trace.
        think: false,
        ...(body.format ? { format: body.format } : {})
      })
    });

    if (!response.ok) {
      throw new AIProviderError(
        ERROR_CODES.OLLAMA_UNAVAILABLE,
        `Ollama responded with an error status (${response.status}).`
      );
    }

    return (await response.json()) as OllamaGenerateResponse;
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new AIProviderError(ERROR_CODES.OLLAMA_TIMEOUT, "The local AI service took too long to respond.");
      }
      throw new AIProviderError(
        ERROR_CODES.OLLAMA_UNAVAILABLE,
        "The local AI service is currently unavailable.",
        { cause: error }
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
