import { NodeFileSystem } from "@effect/platform-node";
import { describe, expect, it } from "bun:test";
import { Effect, Layer } from "effect";
import { MdxService } from "../src/service";

describe("MdxService", () => {
  it("should parse a valid MDX file", async () => {
    const testContent = `---
title: Test Document
expectedOutput: Hello World
---
# Hello World

This is the body content.`;

    // Provide both MdxService and NodeFileSystem (real implementation, not mocked)
    const TestLayer = Layer.provideMerge(MdxService.Default, NodeFileSystem.layer);

    // Test the parseMdxFile function directly without mocking external services
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* MdxService;
        return yield* service.parseMdxFile(testContent);
      }).pipe(
        Effect.provide(TestLayer),
        Effect.either
      )
    );

    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.attributes.title).toBe("Test Document");
      expect(result.right.body.trim()).toBe("# Hello World\n\nThis is the body content.");
    }
  });

  it("should fail to parse an invalid MDX file", async () => {
    const invalidContent = "---\ninvalid: [unclosed array\n---\n# Hello World\n\nThis has invalid YAML frontmatter.";

    // Provide both MdxService and NodeFileSystem (real implementation, not mocked)
    const TestLayer = Layer.provideMerge(MdxService.Default, NodeFileSystem.layer);

    // Test with invalid content
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* MdxService;
        return yield* service.parseMdxFile(invalidContent);
      }).pipe(
        Effect.provide(TestLayer),
        Effect.either
      )
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left._tag).toBe("InvalidMdxFormatError");
    }
  });
});
