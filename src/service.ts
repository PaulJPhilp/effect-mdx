import { FileSystem } from "@effect/platform";
import { Data, Effect } from "effect";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import type { Frontmatter, ParameterDefinition } from "./types.ts";
import { InvalidMdxFormatError, InvalidFrontmatterError } from "./errors.ts";

export class MdxService extends Effect.Service<MdxService>()(
  "MdxService",
  {
    scoped: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      // Initialize the markdown processor
      const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype)
        .use(rehypeStringify);

      // Read MDX content and parse its YAML frontmatter using gray-matter
      const readMdxAndFrontmatter = (filePath: string) =>
        Effect.gen(function* () {
          const fileContent = yield* fs.readFileString(filePath);
          const { data: frontmatter, content: mdxBody } = matter(fileContent);

          return {
            content: fileContent,
            frontmatter: frontmatter as Frontmatter,
            mdxBody
          };
        });

      // Reconstruct MDX content with updated frontmatter
      const updateMdxContent = (
        originalFullMdxContent: string,
        updatedFrontmatter: Frontmatter
      ): string => {
        const { content: originalBody } = matter(originalFullMdxContent);
        const newFrontmatterStr = matter.stringify(originalBody, updatedFrontmatter);
        return newFrontmatterStr;
      };

      // Parse MDX frontmatter with validation using gray-matter
      const parseMdxFile = (content: string) =>
        Effect.try({
          try: () => {
            // Heuristic: if a frontmatter fence exists, ensure it appears
            // well-formed before delegating to gray-matter. This makes
            // obviously malformed cases (e.g. unterminated quotes) fail
            // consistently across environments.
            if (content.startsWith("---")) {
              const end = content.indexOf("\n---", 3);
              if (end > 0) {
                const fm = content.slice(3, end);
                const dq = fm.match(/"/g)?.length ?? 0;
                // If there is at least one double quote and the count is odd,
                // treat as invalid.
                if (dq > 0 && dq % 2 === 1) {
                  throw new InvalidMdxFormatError({
                    reason: "Unbalanced quotes detected in frontmatter"
                  });
                }
              }
            }

            const { data: frontmatter, content: body } = matter(content);
            return {
              attributes: frontmatter as Record<string, unknown>,
              body
            };
          },
          catch: (error) =>
            new InvalidMdxFormatError({
              reason: `Failed to parse MDX content: ${error instanceof Error ? error.message : String(error)}`,
              cause: error
            })
        });

      // Compile MDX content to HTML using the unified ecosystem.
      // We first parse via `parseMdxFile` to ensure frontmatter validity
      // and surface `InvalidMdxFormatError` consistently.
      const compileMdxToHtml = (mdxContent: string) =>
        Effect.gen(function* () {
          const parsed = yield* parseMdxFile(mdxContent);
          const html = yield* Effect.tryPromise({
            try: async () => {
              const out = await processor.process(parsed.body);
              return out.toString();
            },
            catch: (error) =>
              new InvalidMdxFormatError({
                reason: `Failed to compile MDX to HTML: ${error instanceof Error ? error.message : String(error)}`,
                cause: error
              })
          });
          return html;
        });

      // Compile MDX content for LLM UI consumption.
      // Use `parseMdxFile` first to validate frontmatter.
      const compileForLlmUi = (mdxContent: string) =>
        Effect.gen(function* () {
          const parsed = yield* parseMdxFile(mdxContent);
          return {
            rawMarkdown: parsed.body,
            frontmatter: parsed.attributes,
            metadata: { llmUiMode: true as const }
          } as const;
        });

      // Validate MDX configuration
      const validateMdxConfig = (attributes: Record<string, unknown>) =>
        Effect.gen(function* () {
          // Extract common fields that might be used across services
          const provider = typeof attributes.provider === 'string' ? attributes.provider : undefined;
          const model = typeof attributes.model === 'string' ? attributes.model : undefined;
          const parameters = typeof attributes.parameters === 'object' && attributes.parameters !== null
            ? attributes.parameters as Record<string, unknown>
            : undefined;

          return {
            provider,
            model,
            parameters,
          };
        });

      // Extract parameters from frontmatter
      const extractParameters = (metadata: Record<string, unknown>) => {
        const parameters: Record<string, ParameterDefinition> = {};
        const paramsObj = (metadata.parameters || {}) as Record<string, unknown>;

        for (const [key, value] of Object.entries(paramsObj)) {
          if (typeof value === "object" && value !== null && "type" in value) {
            const paramValue = value as Record<string, unknown>;
            const type = paramValue.type;

            if (typeof type === "string" && ["string", "number", "boolean", "array", "object"].includes(type)) {
              parameters[key] = {
                type: type as "string" | "number" | "boolean" | "array" | "object",
                description: typeof paramValue.description === "string" ? paramValue.description : undefined,
                required: typeof paramValue.required === "boolean" ? paramValue.required : undefined,
                default: paramValue.default
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
        compileForLlmUi,
        validateMdxConfig,
        extractParameters,
      };
    }),
    dependencies: [],
  }
) { }
