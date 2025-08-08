import type { Effect } from "effect";
import type { Frontmatter, ParameterDefinition } from "./types.ts";
import type { InvalidMdxFormatError } from "./errors.ts";
import type { PlatformError } from "@effect/platform/Error";

export interface MdxServiceApi {
  readMdxAndFrontmatter: (filePath: string) => Effect.Effect<PlatformError | InvalidMdxFormatError, never, { content: string; frontmatter: Frontmatter; mdxBody: string }>;
  updateMdxContent: (originalFullMdxContent: string, updatedFrontmatter: Frontmatter) => string;
  parseMdxFile: (content: string) => Effect.Effect<InvalidMdxFormatError, never, { attributes: Record<string, unknown>; body: string }>;
  compileMdxToHtml: (mdxContent: string) => Effect.Effect<InvalidMdxFormatError, never, string>;
  compileForLlmUi: (mdxContent: string) => Effect.Effect<InvalidMdxFormatError, never, { rawMarkdown: string; frontmatter: Record<string, unknown>; metadata: { llmUiMode: true } }>;
  validateMdxConfig: (attributes: Record<string, unknown>) => Effect.Effect<never, never, { provider: string | undefined; model: string | undefined; parameters: Record<string, unknown> | undefined }>;
  extractParameters: (metadata: Record<string, unknown>) => Record<string, ParameterDefinition>;
}