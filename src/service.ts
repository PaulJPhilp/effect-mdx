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
    filePath: string
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
    content: string
  ) => Effect.Effect<ParsedMdxAttributes, InvalidMdxFormatError, never>;
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

    const readMdxAndFrontmatter = (filePath: string) =>
      Effect.gen(function* () {
        const fileContent = yield* fs.readFileString(filePath);
        const { data: frontmatter, content: mdxBody } = matter(fileContent);

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

    const parseMdxFile = (content: string) =>
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

        const { data: frontmatter, content: body } = matter(content);

        // Validate frontmatter structure
        yield* decodeFrontmatter(frontmatter).pipe(
          Effect.mapError(
            (error) =>
              new InvalidMdxFormatError({
                reason: `Invalid frontmatter structure: ${error}`,
                cause: error,
              })
          )
        );

        return {
          attributes: frontmatter as Record<string, unknown>,
          body,
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
          try: async () =>
            await mdxCompile(parsed.body, {
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
            }),
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

    return {
      readMdxAndFrontmatter,
      updateMdxContent,
      parseMdxFile,
      compileMdxToHtml,
      compileMdx,
      compileForLlmUi,
      validateMdxConfig,
      extractParameters,
    };
  }),
}) {}

export const MdxServiceLive = MdxService.Default;