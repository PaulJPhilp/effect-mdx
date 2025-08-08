import { Data } from "effect";

/**
 * Common error options including a human-readable reason and an optional cause
 * for chaining underlying exceptions.
 */
export interface ErrorOptions {
  readonly reason: string;
  readonly cause?: unknown;
}

/** Error representing invalid MDX syntax or structure. */
export class InvalidMdxFormatError extends Data.TaggedError("InvalidMdxFormatError")<ErrorOptions> {}
/** Error representing invalid or unsupported frontmatter content. */
export class InvalidFrontmatterError extends Data.TaggedError("InvalidFrontmatterError")<ErrorOptions> {}