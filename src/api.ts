import type { Effect } from "effect";
import type {
  Frontmatter,
  ParameterDefinition,
  MdxCompileOptions,
  CompiledMdxResult,
  ReadMdxAndFrontmatter,
  CompileForLlmUiResult,
  ParsedMdxAttributes,
  MdxConfigValidation,
  Metadata,
  Parameters,
  UnknownRecord,
} from "./types.ts";
import type { InvalidMdxFormatError } from "./errors.ts";
import type { PlatformError } from "@effect/platform/Error";

/**
 * Public API surface for the MDX service.
 *
 * Methods are expressed as Effect.Effect values to enable typed
 * error handling and dependency injection via Effect layers.
 */
export interface MdxServiceApi {
  /**
   * Read a file from disk and parse YAML frontmatter.
   */
  readMdxAndFrontmatter: (
    filePath: string
  ) => Effect.Effect<
    ReadMdxAndFrontmatter,
    PlatformError | InvalidMdxFormatError,
    never
  >;
  /**
   * Reconstruct an MDX string with updated frontmatter.
   */
  updateMdxContent: (
    originalFullMdxContent: string,
    updatedFrontmatter: Frontmatter
  ) => string;
  /**
   * Parse an MDX string into attributes and body.
   */
  parseMdxFile: (
    content: string
  ) => Effect.Effect<ParsedMdxAttributes, InvalidMdxFormatError, never>;
  /**
   * Compile MDX to HTML using remark/rehype.
   */
  compileMdxToHtml: (
    mdxContent: string
  ) => Effect.Effect<string, InvalidMdxFormatError, never>;
  /**
   * Prepare content for the LLM UI.
   */
  compileForLlmUi: (
    mdxContent: string
  ) => Effect.Effect<CompileForLlmUiResult, InvalidMdxFormatError, never>;
  /**
   * Compile MDX to JS/ESM using @mdx-js/mdx.
   */
  compileMdx: (
    mdxContent: string,
    options?: MdxCompileOptions
  ) => Effect.Effect<CompiledMdxResult, InvalidMdxFormatError, never>;
  /**
   * Validate and extract common config fields from attributes.
   */
  validateMdxConfig: (
    attributes: UnknownRecord
  ) => Effect.Effect<MdxConfigValidation, never, never>;
  /**
   * Extract typed parameter definitions from metadata.
   */
  extractParameters: (metadata: Metadata) => Parameters;
}