import type { ErrorCode } from "@ale/shared";

/** A deliberate, expected application error with a stable error code and HTTP status. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;

  constructor(code: ErrorCode, message: string, statusCode: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
