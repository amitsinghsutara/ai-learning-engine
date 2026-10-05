import type { ZodType } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ERROR_CODES } from "@ale/shared";
import type { LLMProvider } from "./provider.js";
import { AIProviderError } from "./errors.js";

export interface GeminiProviderOptions {
  apiKey: string;
  model: string;
  /** Milliseconds to wait for a response before treating the request as timed out. */
  timeoutMs?: number;
  /** Injectable for testing; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

interface GeminiGenerateResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Cloud inference is far faster than local CPU inference; this just guards
// against a hung connection, not slow generation.
const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Gemini's `responseSchema` only understands a small subset of JSON Schema
 * (type/format/description/enum/items/properties/required/nullable). Extra
 * keywords `zod-to-json-schema` emits (minLength, $schema, additionalProperties,
 * etc.) are silently dropped here rather than relied upon for enforcement —
 * the real validation still happens in `validate()` against the original Zod
 * schema, exactly like `OllamaProvider`.
 */
const GEMINI_SCHEMA_KEYS = new Set([
  "type",
  "format",
  "description",
  "nullable",
  "enum",
  "items",
  "properties",
  "required",
  "propertyOrdering"
]);

function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (node === null || typeof node !== "object") return node;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (!GEMINI_SCHEMA_KEYS.has(key)) continue;
    result[key] = key === "properties" ? mapValues(value as Record<string, unknown>, toGeminiSchema) : toGeminiSchema(value);
  }
  return result;
}

function mapValues(obj: Record<string, unknown>, fn: (value: unknown) => unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) out[key] = fn(value);
  return out;
}

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

/** LLMProvider backed by the Google Gemini API. */
export class GeminiProvider implements LLMProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GeminiProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generateText(prompt: string): Promise<string> {
    const result = await this.callGenerate({ prompt });
    return this.extractText(result);
  }

  async generateStructured<T>(prompt: string, schema: ZodType<T>): Promise<T> {
    const jsonSchema = toGeminiSchema(zodToJsonSchema(schema, { target: "jsonSchema7", $refStrategy: "none" }));

    const first = await this.callGenerate({ prompt, schema: jsonSchema });
    const firstText = this.extractText(first);
    const firstResult = this.validate(schema, firstText);
    if (firstResult.success) return firstResult.data;

    const retryPrompt = buildCorrectionPrompt(prompt, firstText, firstResult.issue);
    const second = await this.callGenerate({ prompt: retryPrompt, schema: jsonSchema });
    const secondText = this.extractText(second);
    const secondResult = this.validate(schema, secondText);
    if (secondResult.success) return secondResult.data;

    throw new AIProviderError(
      ERROR_CODES.INVALID_AI_RESPONSE,
      "The Gemini model did not return a response matching the expected format, even after a retry."
    );
  }

  async checkHealth(): Promise<{ available: boolean; model: string }> {
    try {
      const response = await this.fetchWithTimeout(`${API_BASE}/models/${this.model}`, {
        method: "GET",
        headers: { "x-goog-api-key": this.apiKey }
      });
      return { available: response.ok, model: this.model };
    } catch {
      return { available: false, model: this.model };
    }
  }

  private extractText(response: GeminiGenerateResponse): string {
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") {
      throw new AIProviderError(ERROR_CODES.INVALID_AI_RESPONSE, "Gemini returned no usable text in its response.");
    }
    return text;
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

  private async callGenerate(body: { prompt: string; schema?: unknown }): Promise<GeminiGenerateResponse> {
    const response = await this.fetchWithTimeout(`${API_BASE}/models/${this.model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: body.prompt }] }],
        // Deliberately no thinkingConfig: support for it is inconsistent across
        // Gemini model variants (some reject any thinkingConfig with a 400), and
        // the lite models this app defaults to don't need it disabled anyway.
        ...(body.schema
          ? { generationConfig: { responseMimeType: "application/json", responseSchema: body.schema } }
          : {})
      })
    });

    if (!response.ok) {
      throw new AIProviderError(
        ERROR_CODES.GEMINI_UNAVAILABLE,
        `Gemini responded with an error status (${response.status}).`
      );
    }

    return (await response.json()) as GeminiGenerateResponse;
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new AIProviderError(ERROR_CODES.GEMINI_TIMEOUT, "The Gemini API took too long to respond.");
      }
      throw new AIProviderError(
        ERROR_CODES.GEMINI_UNAVAILABLE,
        "The Gemini API is currently unavailable.",
        { cause: error }
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
