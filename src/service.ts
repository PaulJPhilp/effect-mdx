import { FileSystem } from "@effect/platform";
import { compile as mdxCompile } from "@mdx-js/mdx";
import { Effect, Layer, Schema } from "effect";
import matter from "gray-matter";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import type { Pluggable, PluggableList, Plugin } from "unified";
import { unified } from "unified";
import type { Node as UnistNode } from "unist";
import type { VFile } from "vfile";
import type { MdxPipelineConfig } from "./config.js";
import { MdxConfigService } from "./config.js";
import { InvalidMdxFormatError } from "./errors.js";
import type {
  CompiledMdxResult,
  Frontmatter,
  MdxCompileOptions,
  Metadata,
  ParameterDefinition,
  UnknownRecord,
  ReadMdxAndFrontmatter,
  ParsedMdxAttributes,
  CompileForLlmUiResult,
  MdxConfigValidation,
  Parameters,
  FrontmatterOptions,
  ParsedFrontmatterResult,
} from "./types.js";
import type { PlatformError } from "@effect/platform/Error";
import {
  sanitizeToMetadata,
  updateMdxContent,
  validateFrontmatterFence,
} from "./utils.js";
import { decodeFrontmatter, decodeMetadata } from "./schemas.js";
import { isString, isObject, hasStringKey, hasObjectKey } from "./guards.js";

export interface MdxServiceSchema {
  readonly readMdxAndFrontmatter: (
    filePath: string,
    options?: FrontmatterOptions
  ) => Effect.Effect<
    ReadMdxAndFrontmatter,
    PlatformError | InvalidMdxFormatError,
    never
  >;
  readonly updateMdxContent: (
    originalFullMdxContent: string,
    updatedFrontmatter: Frontmatter
  ) => string;
  readonly parseMdxFile: (
    content: string,
    options?: FrontmatterOptions
  ) => Effect.Effect<ParsedMdxAttributes, InvalidMdxFormatError, never>;
  readonly testForFrontmatter: (content: string, options?: FrontmatterOptions) => boolean;
  readonly compileMdxToHtml: (
    mdxContent: string
  ) => Effect.Effect<string, InvalidMdxFormatError, never>;
  readonly compileForLlmUi: (
    mdxContent: string
  ) => Effect.Effect<CompileForLlmUiResult, InvalidMdxFormatError, never>;
  readonly compileMdx: (
    mdxContent: string,
    options?: MdxCompileOptions
  ) => Effect.Effect<CompiledMdxResult, InvalidMdxFormatError, never>;
  readonly validateMdxConfig: (
    attributes: UnknownRecord
  ) => Effect.Effect<MdxConfigValidation, never, never>;
  readonly extractParameters: (metadata: Metadata) => Parameters;
  readonly stringify: (
    file: string | { content: string },
    data: UnknownRecord,
    options?: FrontmatterOptions
  ) => string;
}

export class MdxService extends Effect.Service<MdxServiceSchema>()("MdxService", {
  effect: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const mdxConfig = yield* MdxConfigService;

    const defaultCfg: MdxPipelineConfig = {
      remarkPlugins: [],
      rehypePlugins: [],
      sanitize: false as const,
      slug: false,
      autolinkHeadings: false,
    };
    const cfg: MdxPipelineConfig = mdxConfig.getConfig() ?? defaultCfg;

    const parseFrontmatter = (content: string, options?: FrontmatterOptions): ParsedFrontmatterResult => {
      // Map camelCase options to snake_case for gray-matter compatibility
      const mappedOptions = options ? {
        ...options,
        excerpt_separator: options.excerptSeparator,
        engines: options.engines,
      } : undefined;

      const result = matter(content, mappedOptions as any);
      const stringifyFn = (data?: UnknownRecord, stringifyOptions?: FrontmatterOptions) => {
        const mappedStringifyOptions = stringifyOptions ? {
          ...stringifyOptions,
          excerpt_separator: stringifyOptions.excerptSeparator,
        } : undefined;
        return matter.stringify(result.content, data || result.data, mappedStringifyOptions as any);
      };

      // Make stringify enumerable for compatibility
      Object.defineProperty(stringifyFn, 'name', { value: 'stringify' });

      return {
        data: result.data as UnknownRecord,
        content: result.content,
        excerpt: result.excerpt,
        empty: (result as any).empty,
        isEmpty: (result as any).isEmpty,
        language: result.language,
        matter: result.matter,
        orig: result.orig.toString(),
        stringify: stringifyFn,
      };
    };

    const readMdxAndFrontmatter = (filePath: string, options?: FrontmatterOptions) =>
      Effect.gen(function* () {
        const fileContent = yield* fs.readFileString(filePath);
        const { data: frontmatter, content: mdxBody } = parseFrontmatter(fileContent, options);

        const validatedFrontmatter = yield* decodeFrontmatter(frontmatter).pipe(
          Effect.mapError(
            (error) =>
              new InvalidMdxFormatError({
                reason: `Invalid frontmatter in ${filePath}: ${error}`,
                cause: error,
              })
          )
        );

        return {
          content: fileContent,
          frontmatter: validatedFrontmatter,
          mdxBody,
        };
      });

    const parseMdxFile = (content: string, options?: FrontmatterOptions) =>
      Effect.gen(function* () {
        yield* Effect.try({
          try: () => validateFrontmatterFence(content),
          catch: (error) =>
            new InvalidMdxFormatError({
              reason: `Failed to validate frontmatter fence: ${
                error instanceof Error ? error.message : String(error)
              }`,
              cause: error,
            }),
        });

        const parsed = parseFrontmatter(content, options as any);

        // Validate frontmatter structure
        yield* decodeFrontmatter(parsed.data).pipe(
          Effect.mapError(
            (error) =>
              new InvalidMdxFormatError({
                reason: `Invalid frontmatter structure: ${error}`,
                cause: error,
              })
          )
        );

        return {
          attributes: parsed.data as Record<string, unknown>,
          body: parsed.content,
          excerpt: parsed.excerpt,
          empty: parsed.empty,
          isEmpty: parsed.isEmpty,
          language: parsed.language,
          matter: parsed.matter,
          orig: parsed.orig,
          stringify: parsed.stringify,
        };
      });

    const compileMdxToHtml = (mdxContent: string) =>
      Effect.gen(function* () {
        const parsed = yield* parseMdxFile(mdxContent);
        const html: string = yield* Effect.tryPromise({
          try: async () => {
            const base = unified().use(remarkParse).use(remarkGfm);
            for (const plug of cfg.remarkPlugins) {
              if (Array.isArray(plug)) {
                base.use(plug as PluggableList);
              } else {
                base.use(
                  plug as Plugin<
                    [],
                    string | UnistNode | undefined,
                    unknown
                  >
                );
              }
            }
            base.use(remarkRehype);
            for (const plug of cfg.rehypePlugins) {
              if (Array.isArray(plug)) {
                base.use(plug as PluggableList);
              } else {
                base.use(
                  plug as Plugin<
                    [],
                    string | UnistNode | undefined,
                    unknown
                  >
                );
              }
            }
            base.use(rehypeStringify);
            const finalProc = base;
            const out = await finalProc.process(parsed.body);
            if (out.messages.length > 0) {
              const errors = out.messages.map(msg => msg.message).join("; ");
              throw new InvalidMdxFormatError({
                reason: `MDX compilation failed: ${errors}`,
                cause: out.messages,
              });
            }
            return out.toString();
          },
          catch: (error) =>
            new InvalidMdxFormatError({
              reason: `Failed to compile MDX to HTML: ${
                error instanceof Error ? error.message : String(error)
              }`,
              cause: error,
            }),
        });
        return html;
      });

    const compileMdx = (mdxContent: string, options?: MdxCompileOptions) =>
      Effect.gen(function* () {
        const parsed = yield* parseMdxFile(mdxContent);
        const file = yield* Effect.tryPromise({
          try: async () => {
            let result;
            try {
              result = await mdxCompile(parsed.body, {
                remarkPlugins: options?.remarkPlugins
                  ? Array.from(options.remarkPlugins)
                  : Array.from(cfg.remarkPlugins),
                rehypePlugins: options?.rehypePlugins
                  ? Array.from(options.rehypePlugins)
                  : Array.from(cfg.rehypePlugins),
                development: options?.development,
                format: options?.format ?? "mdx",
                outputFormat: options?.outputFormat ?? "program",
                providerImportSource: options?.providerImportSource,
              });
            } catch (error) {
              throw new InvalidMdxFormatError({
                reason: `MDX compilation failed: ${error instanceof Error ? error.message : String(error)}`,
                cause: error,
              });
            }

            if (result.messages.length > 0) {
              const errors = result.messages.map(msg => msg.message).join("; ");
              throw new InvalidMdxFormatError({
                reason: `MDX compilation failed: ${errors}`,
                cause: result.messages,
              });
            }
            return result;
          },
          catch: (error) =>
            new InvalidMdxFormatError({
              reason: `Failed to compile MDX: ${
                error instanceof Error ? error.message : String(error)
              }`,
              cause: error,
            }),
        });

        const vf = file as VFile & {
          map?: unknown;
          data?: Record<string, unknown>;
        };
        const result: CompiledMdxResult = {
          code: String(vf.value ?? ""),
          map:
            vf.map ??
            (vf.data ? (vf.data as Record<string, unknown>).map : undefined),
          messages: (vf.messages as VFile["messages"]) ?? [],
          frontmatter: sanitizeToMetadata(parsed.attributes),
        };
        return result;
      });

    const compileForLlmUi = (mdxContent: string) =>
      Effect.gen(function* () {
        const parsed = yield* parseMdxFile(mdxContent);
        return {
          rawMarkdown: parsed.body,
          frontmatter: sanitizeToMetadata(parsed.attributes),
          metadata: { llmUiMode: true as const },
        } as const;
      });

    const validateMdxConfig = (attributes: UnknownRecord) => {
      const provider = hasStringKey(attributes, "provider")
        ? attributes.provider
        : undefined;
      const model = hasStringKey(attributes, "model")
        ? attributes.model
        : undefined;
      const parameters = hasObjectKey(attributes, "parameters")
        ? sanitizeToMetadata(attributes.parameters)
        : undefined;

      return Effect.succeed({
        provider,
        model,
        parameters,
      });
    };

    const testForFrontmatter = (content: string, options?: FrontmatterOptions): boolean => {
      return matter.test(content, options as any);
    };

    const extractParameters = (metadata: Metadata) => {
      const parameters: Record<string, ParameterDefinition> = {};

      if (!hasObjectKey(metadata, "parameters")) {
        return parameters;
      }

      const paramsObj = metadata.parameters;

      for (const [key, value] of Object.entries(paramsObj)) {
        if (isObject(value) && hasStringKey(value, "type")) {
          const type = value.type;

          if (
            ["string", "number", "boolean", "array", "object"].includes(type)
          ) {
            const paramDef: ParameterDefinition = {
              type: type as
                | "string"
                | "number"
                | "boolean"
                | "array"
                | "object",
              description: hasStringKey(value, "description")
                ? value.description
                : undefined,
              required: "required" in value ? (value.required === true) : undefined,
              default: "default" in value ? value.default : undefined,
            };
            parameters[key] = paramDef;
          }
        }
      }

      return parameters;
    };

    const stringify = (file: string | { content: string }, data: UnknownRecord, options?: FrontmatterOptions): string => {
      return matter.stringify(file, data, options as any);
    };

    return {
      readMdxAndFrontmatter,
      updateMdxContent,
      parseMdxFile,
      testForFrontmatter,
      compileMdxToHtml,
      compileMdx,
      compileForLlmUi,
      validateMdxConfig,
      extractParameters,
      stringify,
    };
  }),
}) {}

export const MdxServiceLive = MdxService.Default;