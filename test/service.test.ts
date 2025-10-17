import { FileSystem } from "@effect/platform";
import { Effect, Layer } from "effect";
import { describe, it, expect } from "bun:test";
import { MdxService, MdxServiceLive } from "../src/service";
import { MdxConfigService } from "../src/config";

const testMdxContent = `--- 
title: Test Title
author: John Doe
---

# Hello World

This is a test MDX file.
`;

describe("MdxService", () => {
  const mockFsLayer = Layer.succeed(
    FileSystem.FileSystem,
    FileSystem.make({
      readFile: (_path) => Effect.succeed(new Uint8Array(Buffer.from(testMdxContent))),
      readFileString: (_path, _encoding) => Effect.succeed(testMdxContent),
    })
  );

  const mockConfigLayer = Layer.succeed(
    MdxConfigService,
    {
      getConfig: () => ({
        remarkPlugins: [],
        rehypePlugins: [],
        sanitize: false,
        slug: false,
        autolinkHeadings: false,
      }),
    }
  );

  const testLayer = MdxServiceLive.pipe(
    Layer.provide(mockFsLayer),
    Layer.provide(mockConfigLayer)
  );

  it("should read mdx and frontmatter", async () => {
    const program = Effect.gen(function* () {
      const mdx = yield* MdxService;
      return yield* mdx.readMdxAndFrontmatter("test.mdx");
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

    expect(result.content).toBe(testMdxContent);
    expect(result.frontmatter).toEqual({ title: "Test Title", author: "John Doe" });
    expect(result.mdxBody).toBe("\n# Hello World\n\nThis is a test MDX file.\n");
  });

  it("should parse mdx file", async () => {
    const program = Effect.gen(function* () {
      const mdx = yield* MdxService;
      return yield* mdx.parseMdxFile(testMdxContent);
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

    expect(result.attributes).toEqual({ title: "Test Title", author: "John Doe" });
    expect(result.body).toBe("\n# Hello World\n\nThis is a test MDX file.\n");
  });

  it("should compile mdx to html", async () => {
    const program = Effect.gen(function* () {
      const mdx = yield* MdxService;
      return yield* mdx.compileMdxToHtml(testMdxContent);
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

    expect(result).toContain("<h1>Hello World</h1>");
    expect(result).toContain("<p>This is a test MDX file.</p>");
  });

  it("should compile mdx", async () => {
    const program = Effect.gen(function* () {
      const mdx = yield* MdxService;
      return yield* mdx.compileMdx(testMdxContent);
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

    expect(result.code).toBeDefined();
    expect(result.frontmatter).toEqual({ title: "Test Title", author: "John Doe" });
  });

  it("should compile for llm ui", async () => {
    const program = Effect.gen(function* () {
      const mdx = yield* MdxService;
      return yield* mdx.compileForLlmUi(testMdxContent);
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

    expect(result.rawMarkdown).toBe("\n# Hello World\n\nThis is a test MDX file.\n");
    expect(result.frontmatter).toEqual({ title: "Test Title", author: "John Doe" });
    expect(result.metadata).toEqual({ llmUiMode: true });
  });

  it("should validate mdx config", async () => {
    const program = Effect.gen(function* () {
      const mdx = yield* MdxService;
      return yield* mdx.validateMdxConfig({ provider: "test", model: "test-model" });
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

    expect(result.provider).toBe("test");
    expect(result.model).toBe("test-model");
  });

  it("should extract parameters", async () => {
    const program = Effect.gen(function* () {
      const mdx = yield* MdxService;
      return mdx.extractParameters({
        parameters: {
          name: { type: "string", description: "Your name" },
          age: { type: "number", required: true },
        },
      });
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

    expect(result).toEqual({
      name: { type: "string", description: "Your name" },
      age: { type: "number", required: true },
    });
  });

  

  it("should test for frontmatter presence", async () => {
    const contentWithoutFrontmatter = `# Just content

No frontmatter here.`;
    const program = Effect.gen(function* () {
      const mdx = yield* MdxService;
      const withFrontmatter = mdx.testForFrontmatter(testMdxContent);
      const withoutFrontmatter = mdx.testForFrontmatter(contentWithoutFrontmatter);
      return { withFrontmatter, withoutFrontmatter };
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

    expect(result.withFrontmatter).toBe(true);
    expect(result.withoutFrontmatter).toBe(false);
  });

  it("should parse JSON frontmatter", async () => {
  const jsonMdxContent = `---json
{"title": "JSON Title", "author": "John Doe"}
---

# Hello World

This is content.`;
  const program = Effect.gen(function* () {
  const mdx = yield* MdxService;
  return yield* mdx.parseMdxFile(jsonMdxContent, { language: "json" });
  });

  const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

  expect(result.attributes).toEqual({ title: "JSON Title", author: "John Doe" });
  expect(result.body).toContain("# Hello World");
  });

  it("should stringify frontmatter", async () => {
    const program = Effect.gen(function* () {
      const mdx = yield* MdxService;

      // Test stringifying with content string
      const result1 = mdx.stringify("Hello world content", { title: "Test", author: "John" });

      // Test stringifying with content object
      const result2 = mdx.stringify({ content: "Hello world content" }, { title: "Test", author: "John" });

      // Test with JSON language
      const result3 = mdx.stringify("Hello world content", { title: "Test", author: "John" }, { language: "json" });

      return { result1, result2, result3 };
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

    // Should contain frontmatter delimiters
    expect(result.result1).toContain("---");
    expect(result.result1).toContain("title: Test");
    expect(result.result1).toContain("author: John");
    expect(result.result1).toContain("Hello world content");

    // Both string and object content should produce same result
    expect(result.result1).toBe(result.result2);

    // JSON language should use JSON format
    expect(result.result3).toContain('"title": "Test"');
    expect(result.result3).toContain('"author": "John"');
    expect(result.result3).toContain("Hello world content");
  });

  it("should support custom engines", async () => {
    const program = Effect.gen(function* () {
      const mdx = yield* MdxService;

      // Create a simple custom engine that reverses strings
      const reverseEngine = {
        parse: (str: string) => {
          // Simple mock: parse "key=value" format
          const result: Record<string, string> = {};
          str.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
              result[key.trim()] = value.trim();
            }
          });
          return result;
        },
        stringify: (data: Record<string, unknown>) => {
          return Object.entries(data).map(([k, v]) => `${k}=${v}`).join('\n');
        }
      };

      // Test parsing with custom engine
      const customContent = `---custom
title=Custom Engine Test
author=Test Author
---
Custom content here.`;

      const parsed = yield* mdx.parseMdxFile(customContent, {
        language: "custom",
        engines: {
          custom: reverseEngine
        }
      });

      // Test stringifying with custom engine
      const stringified = mdx.stringify("New content", { title: "New Title" }, {
        language: "custom",
        engines: {
          custom: reverseEngine
        }
      });

      return { parsed, stringified };
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

    // Should parse with custom engine
    expect(result.parsed.attributes.title).toBe("Custom Engine Test");
    expect(result.parsed.attributes.author).toBe("Test Author");
    expect(result.parsed.language).toBe("custom");

    // Should stringify with custom engine
    expect(result.stringified).toContain("title=New Title");
    expect(result.stringified).toContain("New content");
  });
});