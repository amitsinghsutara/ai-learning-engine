import type { ErrorCode } from "@ale/shared";

/** Raised whenever the AI layer cannot produce a usable, validated result. */
export class AIProviderError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AIProviderError";
    this.code = code;
  }
}
