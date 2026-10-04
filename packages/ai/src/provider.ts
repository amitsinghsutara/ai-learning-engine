import type { ZodType } from "zod";

/**
 * The application depends only on this interface, never on Ollama directly.
 * A future cloud or alternative local provider can be added by implementing
 * this interface without changing the learning engine or API layer.
 */
export interface ProviderHealth {
  available: boolean;
  model: string;
}

export interface LLMProvider {
  generateText(prompt: string): Promise<string>;
  generateStructured<T>(prompt: string, schema: ZodType<T>): Promise<T>;
  /** Optional: implementations may expose a lightweight health/availability check. */
  checkHealth?(): Promise<ProviderHealth>;
}
