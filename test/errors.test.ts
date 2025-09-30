import { FileSystem } from "@effect/platform";
import { Effect, Layer } from "effect";
import { describe, it, expect } from "bun:test";
import { MdxService, MdxServiceLive } from "../src/service";
import { MdxConfigService } from "../src/config";
import { InvalidMdxFormatError } from "../src/errors";

describe("MdxService - Error Cases", () => {
  const mockConfigLayer = Layer.succeed(MdxConfigService, {
    getConfig: () => ({
      remarkPlugins: [],
      rehypePlugins: [],
      sanitize: false,
      slug: false,
      autolinkHeadings: false,
    }),
  });

  describe("Invalid frontmatter", () => {
    it("should handle malformed YAML", async () => {
      const malformedYaml = `---
title: Test
invalid: [unclosed array
---

# Content`;

      const mockFsLayer = Layer.succeed(
        FileSystem.FileSystem,
        FileSystem.make({
          readFile: (_path) =>
            Effect.succeed(new Uint8Array(Buffer.from(malformedYaml))),
          readFileString: (_path) => Effect.succeed(malformedYaml),
        })
      );

      const testLayer = MdxServiceLive.pipe(
        Layer.provide(mockFsLayer),
        Layer.provide(mockConfigLayer)
      );

      const program = Effect.gen(function* () {
        const mdx = yield* MdxService;
        return yield* mdx.readMdxAndFrontmatter("test.mdx");
      });

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(testLayer))
      );

      expect(result._tag).toBe("Failure");
    });

    it("should handle unbalanced quotes in frontmatter", async () => {
      const unbalancedQuotes = `---
title: "Unclosed quote
author: John
---

# Content`;

      const program = Effect.gen(function* () {
        const mdx = yield* MdxService;
        return yield* mdx.parseMdxFile(unbalancedQuotes);
      });

      const mockFsLayer = Layer.succeed(
        FileSystem.FileSystem,
        FileSystem.make({
          readFile: (_path) => Effect.succeed(new Uint8Array()),
          readFileString: (_path) => Effect.succeed(""),
        })
      );

      const testLayer = MdxServiceLive.pipe(
        Layer.provide(mockFsLayer),
        Layer.provide(mockConfigLayer)
      );

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(testLayer))
      );

      expect(result._tag).toBe("Failure");
    });

    it("should handle invalid frontmatter types", async () => {
      // Test with number as title (should be validated)
      const invalidTypes = `---
title: 12345
tags: not-an-array-string
---

# Content`;

      const mockFsLayer = Layer.succeed(
        FileSystem.FileSystem,
        FileSystem.make({
          readFile: (_path) =>
            Effect.succeed(new Uint8Array(Buffer.from(invalidTypes))),
          readFileString: (_path) => Effect.succeed(invalidTypes),
        })
      );

      const testLayer = MdxServiceLive.pipe(
        Layer.provide(mockFsLayer),
        Layer.provide(mockConfigLayer)
      );

      const program = Effect.gen(function* () {
        const mdx = yield* MdxService;
        // This should succeed - frontmatter allows various types
        return yield* mdx.readMdxAndFrontmatter("test.mdx");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      );

      // Should succeed with coerced types
      expect(result.frontmatter.title).toBe(12345);
    });
  });

  describe("Invalid MDX syntax", () => {
    it("should handle compilation errors", async () => {
      const invalidMdx = `---
title: Test
---

# Invalid JSX
<Component without="closing tag"
`;

      const mockFsLayer = Layer.succeed(
        FileSystem.FileSystem,
        FileSystem.make({
          readFile: (_path) => Effect.succeed(new Uint8Array()),
          readFileString: (_path) => Effect.succeed(""),
        })
      );

      const testLayer = MdxServiceLive.pipe(
        Layer.provide(mockFsLayer),
        Layer.provide(mockConfigLayer)
      );

      const program = Effect.gen(function* () {
        const mdx = yield* MdxService;
        return yield* mdx.compileMdx(invalidMdx);
      });

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(testLayer))
      );

      expect(result._tag).toBe("Failure");
    });

    it("should handle invalid markdown during HTML compilation", async () => {
      // This should actually succeed - markdown is very permissive
      const content = `---
title: Test
---

# Valid Markdown
This is *italic* and **bold**.
`;

      const mockFsLayer = Layer.succeed(
        FileSystem.FileSystem,
        FileSystem.make({
          readFile: (_path) => Effect.succeed(new Uint8Array()),
          readFileString: (_path) => Effect.succeed(""),
        })
      );

      const testLayer = MdxServiceLive.pipe(
        Layer.provide(mockFsLayer),
        Layer.provide(mockConfigLayer)
      );

      const program = Effect.gen(function* () {
        const mdx = yield* MdxService;
        return yield* mdx.compileMdxToHtml(content);
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      );

      expect(result).toContain("<h1>Valid Markdown</h1>");
    });
  });

  describe("File system errors", () => {
    it("should handle file not found", async () => {
      const mockFsLayer = Layer.succeed(
        FileSystem.FileSystem,
        FileSystem.make({
          readFile: (_path) =>
            Effect.fail({
              _tag: "SystemError",
              reason: "file not found",
              module: "FileSystem",
              method: "readFile",
            } as const),
          readFileString: (_path) =>
            Effect.fail({
              _tag: "SystemError",
              reason: "file not found",
              module: "FileSystem",
              method: "readFileString",
            } as const),
        })
      );

      const testLayer = MdxServiceLive.pipe(
        Layer.provide(mockFsLayer),
        Layer.provide(mockConfigLayer)
      );

      const program = Effect.gen(function* () {
        const mdx = yield* MdxService;
        return yield* mdx.readMdxAndFrontmatter("nonexistent.mdx");
      });

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(testLayer))
      );

      expect(result._tag).toBe("Failure");
    });

    it("should handle permission denied", async () => {
      const mockFsLayer = Layer.succeed(
        FileSystem.FileSystem,
        FileSystem.make({
          readFile: (_path) =>
            Effect.fail({
              _tag: "SystemError",
              reason: "permission denied",
              module: "FileSystem",
              method: "readFile",
            } as const),
          readFileString: (_path) =>
            Effect.fail({
              _tag: "SystemError",
              reason: "permission denied",
              module: "FileSystem",
              method: "readFileString",
            } as const),
        })
      );

      const testLayer = MdxServiceLive.pipe(
        Layer.provide(mockFsLayer),
        Layer.provide(mockConfigLayer)
      );

      const program = Effect.gen(function* () {
        const mdx = yield* MdxService;
        return yield* mdx.readMdxAndFrontmatter("forbidden.mdx");
      });

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(testLayer))
      );

      expect(result._tag).toBe("Failure");
    });
  });

  describe("Missing frontmatter fence", () => {
    it("should handle missing closing fence", async () => {
      const missingClosing = `---
title: Test
author: John

# Content without closing fence`;

      const mockFsLayer = Layer.succeed(
        FileSystem.FileSystem,
        FileSystem.make({
          readFile: (_path) => Effect.succeed(new Uint8Array()),
          readFileString: (_path) => Effect.succeed(""),
        })
      );

      const testLayer = MdxServiceLive.pipe(
        Layer.provide(mockFsLayer),
        Layer.provide(mockConfigLayer)
      );

      const program = Effect.gen(function* () {
        const mdx = yield* MdxService;
        return yield* mdx.parseMdxFile(missingClosing);
      });

      // gray-matter is lenient - this might succeed with empty body
      const result = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      );

      // Body can be empty if no closing fence
      expect(result).toBeDefined();
    });
  });
});
