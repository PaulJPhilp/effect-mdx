
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
 * Note: plugin arrays are intentionally loose to match upstream types.
 */
export interface MdxCompileOptions {
  readonly remarkPlugins?: Array<any>;
  readonly rehypePlugins?: Array<any>;
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

/** Extracted fields from frontmatter relevant to configuration. */
export type MdxConfigValidation = {
  provider: string | undefined;
  model: string | undefined;
  parameters: Metadata | undefined;
};