import { FileSystem } from "@effect/platform";
import { Effect, Layer } from "effect";
import { describe, it, expect } from "bun:test";
import { MdxService } from "../src/service";
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
    MdxConfigService.of({
      getConfig: () => ({
        remarkPlugins: [],
        rehypePlugins: [],
        sanitize: false,
        slug: false,
        autolinkHeadings: false,
      }),
    })
  );

  const testLayer = Layer.provide(
    MdxService.DefaultWithoutDependencies,
    Layer.merge(mockFsLayer, mockConfigLayer)
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
});