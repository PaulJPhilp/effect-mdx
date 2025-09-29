import { FileSystem } from "@effect/platform";
import { compile as mdxCompile } from "@mdx-js/mdx";
import { Effect } from "effect";
import matter from "gray-matter";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import type { Pluggable, PluggableList, Plugin } from "unified";
import { unified } from "unified";
import type { Node as UnistNode } from "unist";
import type { VFile } from "vfile";
import type { MdxPipelineConfig } from "./config";
import { MdxConfigService } from "./config";
import { InvalidMdxFormatError } from "./errors";
import type {
  CompiledMdxResult,
  Frontmatter,
  MdxCompileOptions,
  Metadata,
  ParameterDefinition,
  UnknownRecord,
} from "./types";
import {
  sanitizeToMetadata,
  updateMdxContent,
  validateFrontmatterFence,
} from "./utils";

export class MdxService extends Effect.Service()("MdxService", {
  scoped: Effect.gen(function* () {
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

        return {
          content: fileContent,
          frontmatter: frontmatter as Frontmatter,
          mdxBody,
        };
      });

    const parseMdxFile = (content: string) =>
      Effect.try({
        try: () => {
          validateFrontmatterFence(content);

          const { data: frontmatter, content: body } = matter(content);
          return {
            attributes: frontmatter as Record<string, unknown>,
            body,
          };
        },
        catch: (error) =>
          new InvalidMdxFormatError({
            reason: `Failed to parse MDX content: ${
              error instanceof Error ? error.message : String(error)
            }`,
            cause: error,
          }),
      });

    const compileMdxToHtml = (mdxContent: string) =>
      Effect.gen(function* () {
        const parsed = yield* parseMdxFile(mdxContent);
        const html: string = yield* Effect.tryPromise({
          try: async () => {
            const base = unified().use(remarkParse).use(remarkGfm);
            for (const plug of cfg.remarkPlugins as unknown as ReadonlyArray<Pluggable>) {
              if (Array.isArray(plug)) {
                base.use(plug as unknown as PluggableList);
              } else {
                base.use(
                  plug as unknown as Plugin<
                    [],
                    string | UnistNode | undefined,
                    unknown
                  >
                );
              }
            }
            base.use(remarkRehype);
            for (const plug of cfg.rehypePlugins as unknown as ReadonlyArray<Pluggable>) {
              if (Array.isArray(plug)) {
                base.use(plug as unknown as PluggableList);
              } else {
                base.use(
                  plug as unknown as Plugin<
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
                ? Array.from(options.remarkPlugins as Pluggable[])
                : Array.from(cfg.remarkPlugins as unknown as Pluggable[]),
              rehypePlugins: options?.rehypePlugins
                ? Array.from(options.rehypePlugins as Pluggable[])
                : Array.from(cfg.rehypePlugins as unknown as Pluggable[]),
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
      const provider =
        typeof attributes.provider === "string"
          ? attributes.provider
          : undefined;
      const model =
        typeof attributes.model === "string" ? attributes.model : undefined;
      const rawParams = (attributes as Record<string, unknown>).parameters;
      const parameters =
        typeof rawParams === "object" && rawParams !== null
          ? sanitizeToMetadata(rawParams as Record<string, unknown>)
          : undefined;

      return Effect.succeed({
        provider,
        model,
        parameters,
      });
    };

    const extractParameters = (metadata: Metadata) => {
      const parameters: Record<string, ParameterDefinition> = {};
      const paramsNode = (metadata as { readonly parameters?: unknown })
        .parameters;
      const paramsObj =
        paramsNode && typeof paramsNode === "object"
          ? (paramsNode as Record<string, unknown>)
          : {};

      for (const [key, value] of Object.entries(paramsObj)) {
        if (typeof value === "object" && value !== null && "type" in value) {
          const paramValue = value as Record<string, unknown>;
          const type = paramValue.type;

          if (
            typeof type === "string" &&
            ["string", "number", "boolean", "array", "object"].includes(type)
          ) {
            parameters[key] = {
              type: type as
                | "string"
                | "number"
                | "boolean"
                | "array"
                | "object",
              description:
                typeof paramValue.description === "string"
                  ? paramValue.description
                  : undefined,
              required:
                typeof paramValue.required === "boolean"
                  ? paramValue.required
                  : undefined,
              default: paramValue.default,
            };
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
  dependencies: [FileSystem.FileSystem, MdxConfigService.Default],
}) {}