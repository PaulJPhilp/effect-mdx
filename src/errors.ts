import { Data } from "effect";

// Error types with cause tracking
export interface ErrorOptions {
  readonly reason: string;
  readonly cause?: unknown;
}

export class InvalidMdxFormatError extends Data.TaggedError("InvalidMdxFormatError")<ErrorOptions> {}
export class InvalidFrontmatterError extends Data.TaggedError("InvalidFrontmatterError")<ErrorOptions> {}