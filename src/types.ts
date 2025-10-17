import type { Pluggable } from "unified";

/**
 * Canonical JSON primitive values.
 */
export type JSONPrimitive = string | number | boolean | null;
/**
 * A JSON value (primitive, object or array).
 */
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;
/**
 * A JSON object with string keys and JSON values.
 */
export interface JSONObject {
  readonly [key: string]: JSONValue;
}
/**
 * A JSON array with JSON values.
 */
export interface JSONArray extends Array<JSONValue> { }

/**
 * Project-wide alias for JSON metadata objects.
 */
export type Metadata = JSONObject;


/**
 * Frontmatter fields allowed in MDX files.
 * Includes optional testing helpers and arbitrary metadata.
 */
export type Frontmatter = {
  readonly expectedOutput?: string;
  readonly expectedError?: string;
  needsReview?: boolean;
} & Metadata;

/**
 * Result of reading an MDX file including parsed frontmatter.
 */
export interface ParsedMdxFile {
  readonly content: string;
  readonly frontmatter: Frontmatter;
  readonly body: string;
}

/** A record with unknown values. */
export type UnknownRecord = Record<string, unknown>;

/**
 * Result of reading file content and frontmatter for convenience.
 */
export type ReadMdxAndFrontmatter = {
  content: string;
  frontmatter: Frontmatter;
  mdxBody: string;
};

/**
 * Result of parsing MDX content into attributes and body.
 */
export type ParsedMdxAttributes = {
  attributes: UnknownRecord;
  body: string;
  /** When the front-matter is "empty" (either all whitespace, nothing at all, or just comments and no data), the original string is set on this property. */
  empty?: string;
  /** True if front-matter is empty. */
  isEmpty?: boolean;
  /** The detected language. */
  language: string;
  /** The raw frontmatter string. */
  matter: string;
  /** The original input string. */
  orig: string;
  /** Stringify the file by converting data to a string in the given language, wrapping it in delimiters and prepending it to content. */
  stringify: (data?: UnknownRecord, options?: FrontmatterOptions) => string;
};

/** Supported parameter primitive kinds. */
export type ParameterType = "string" | "number" | "boolean" | "array" | "object";

/**
 * Definition of a single parameter used by prompts/templates.
 */
export interface ParameterDefinition {
  type: ParameterType;
  description?: string;
  required?: boolean;
  default?: unknown;
}

/** Map of parameter names to their definitions. */
export type Parameters = Record<string, ParameterDefinition>;

/**
 * A prompt template with parameter declarations.
 */
export interface PromptTemplate {
  readonly content: string;
  readonly parameters: Parameters;
  readonly body: string;
}

/**
 * Options forwarded to @mdx-js/mdx.
 * Plugin arrays use the `Pluggable` type from unified for type safety.
 */
export interface MdxCompileOptions {
  readonly remarkPlugins?: ReadonlyArray<Pluggable>;
  readonly rehypePlugins?: ReadonlyArray<Pluggable>;
  readonly development?: boolean;
  readonly format?: "mdx" | "md";
  readonly outputFormat?: "program" | "function-body";
  readonly providerImportSource?: string;
}

/** Result of compiling MDX to JS/ESM. */
export interface CompiledMdxResult {
  readonly code: string;
  readonly map?: unknown;
  readonly messages: ReadonlyArray<unknown>;
  readonly frontmatter: Metadata;
}

/** Result for LLM UI consumption. */
export type CompileForLlmUiResult = {
  rawMarkdown: string;
  frontmatter: Metadata;
  metadata: { llmUiMode: true };
};

/**
 * Options for frontmatter parsing with gray-matter.
 */
export interface FrontmatterOptions {
  /** Language for frontmatter parsing. Defaults to 'yaml'. Supports 'yaml', 'json', 'toml', etc. */
  readonly language?: string;
  /** Custom delimiters. Can be a string (same for open/close) or [open, close] array. Defaults to '---'. */
  readonly delimiters?: string | readonly [string, string];
  /** Extract excerpt from content. Can be true, false, or a custom function. */
  readonly excerpt?: boolean | ((input: string, options: FrontmatterOptions) => string);
  /** Custom separator for excerpt extraction. */
  readonly excerptSeparator?: string;
  /** Define custom engines for parsing/stringifying front-matter. */
  readonly engines?: Record<string, unknown>;
}

/**
 * Extended result of parsing frontmatter with additional gray-matter properties.
 */
export interface ParsedFrontmatterResult {
  /** The parsed frontmatter data. */
  readonly data: UnknownRecord;
  /** The content without frontmatter. */
  readonly content: string;
  /** The excerpt if extracted. */
  readonly excerpt?: string;
  /** When the front-matter is "empty" (either all whitespace, nothing at all, or just comments and no data), the original string is set on this property. */
  readonly empty?: string;
  /** True if front-matter is empty. */
  readonly isEmpty?: boolean;
  /** The detected language. */
  readonly language: string;
  /** The raw frontmatter string. */
  readonly matter: string;
  /** The original input string. */
  readonly orig: string;
  /** Stringify the file by converting data to a string in the given language, wrapping it in delimiters and prepending it to content. */
  readonly stringify: (data?: UnknownRecord, options?: FrontmatterOptions) => string;
}

/** Extracted fields from frontmatter relevant to configuration. */
export type MdxConfigValidation = {
  provider: string | undefined;
  model: string | undefined;
  parameters: Metadata | undefined;
};