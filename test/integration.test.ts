import { FileSystem } from "@effect/platform";
import { Effect, Layer } from "effect";
import { describe, it, expect } from "bun:test";
import { MdxService, MdxServiceLive } from "../src/service";
import { MdxConfigService } from "../src/config";
import { InvalidMdxFormatError } from "../src/errors";

const testBlogContent = `---yaml
title: "My Blog Post"
author: "John Doe"
tags: ["react", "mdx"]
published: true
---

# Welcome to My Blog

This is a blog post written in **MDX**.

<CustomComponent prop="value">
  Some content inside a custom component.
</CustomComponent>

## Code Example

\`\`\`javascript
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`

> This is a blockquote with some *emphasis*.

[Read more about MDX](https://mdxjs.com)`;

describe("MdxService - Integration Tests", () => {
  const mockFsLayer = Layer.succeed(
    FileSystem.FileSystem,
    FileSystem.make({
      readFile: (_path) => Effect.succeed(new Uint8Array(Buffer.from(testBlogContent))),
      readFileString: (_path, _encoding) => Effect.succeed(testBlogContent),
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

  describe("Complete MDX Processing Workflows", () => {
    it("should demonstrate new frontmatter features", async () => {
      const yamlContent = `---yaml
title: "Test Post"
author: "Test Author"
tags: ["test"]
---

# Test Content

This is test content.`;

      const jsonContent = `---json
{"title": "JSON Test", "type": "demo"}
---

# JSON Content

JSON frontmatter test.`;

      const program = Effect.gen(function* () {
        const mdx = yield* MdxService;

        // Test YAML parsing
        const yamlParsed = yield* mdx.parseMdxFile(yamlContent);

        // Test JSON parsing
        const jsonParsed = yield* mdx.parseMdxFile(jsonContent, { language: "json" });

        // Test frontmatter detection
        const yamlHasFrontmatter = mdx.testForFrontmatter(yamlContent);
        const jsonHasFrontmatter = mdx.testForFrontmatter(jsonContent, { language: "json" });
        const noFrontmatter = mdx.testForFrontmatter("# No frontmatter\n\nJust content.");

        // Test custom delimiters
        const customDelimitersContent = `~~~
title: "Custom Delimiters"
~~~

# Custom Content`;
        const customParsed = yield* mdx.parseMdxFile(customDelimitersContent, {
          delimiters: "~~~"
        });

        return {
          yamlParsed,
          jsonParsed,
          yamlHasFrontmatter,
          jsonHasFrontmatter,
          noFrontmatter,
          customParsed
        };
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      // Verify YAML parsing
      expect(result.yamlParsed.attributes).toEqual({
        title: "Test Post",
        author: "Test Author",
        tags: ["test"],
      });

      // Verify JSON parsing
      expect(result.jsonParsed.attributes).toEqual({
        title: "JSON Test",
        type: "demo",
      });

      // Verify frontmatter detection
      expect(result.yamlHasFrontmatter).toBe(true);
      expect(result.jsonHasFrontmatter).toBe(true);
      expect(result.noFrontmatter).toBe(false);

      // Verify custom delimiters
      expect(result.customParsed.attributes).toEqual({
        title: "Custom Delimiters",
      });
    });

    it("should parse the same content with different frontmatter options", async () => {
      const program = Effect.gen(function* () {
        const mdx = yield* MdxService;

        // Parse with default YAML
        const yamlParsed = yield* mdx.parseMdxFile(testBlogContent);

        // Parse with explicit YAML option
        const yamlExplicit = yield* mdx.parseMdxFile(testBlogContent, { language: "yaml" });

        // Test frontmatter presence
        const hasFrontmatter = mdx.testForFrontmatter(testBlogContent);

        return { yamlParsed, yamlExplicit, hasFrontmatter };
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      // Both should parse the same YAML frontmatter
      expect(result.yamlParsed.attributes).toEqual(result.yamlExplicit.attributes);
      expect(result.yamlParsed.attributes).toEqual({
        title: "My Blog Post",
        author: "John Doe",
        tags: ["react", "mdx"],
        published: true,
      });

      // Should detect frontmatter
      expect(result.hasFrontmatter).toBe(true);
    });

    it("should handle excerpt extraction", async () => {
      const contentWithExcerpt = `---yaml
title: "Test Post"
---

This is the excerpt content.

<!-- excerpt -->

This content comes after the excerpt separator.`;

      const program = Effect.gen(function* () {
        const mdx = yield* MdxService;

        const parsedWithExcerpt = yield* mdx.parseMdxFile(contentWithExcerpt, {
          excerpt: true,
          excerptSeparator: "<!-- excerpt -->",
        });

        const parsedWithoutExcerpt = yield* mdx.parseMdxFile(contentWithExcerpt);

        return { parsedWithExcerpt, parsedWithoutExcerpt };
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      // Both should have the same attributes
      expect(result.parsedWithExcerpt.attributes).toEqual(result.parsedWithoutExcerpt.attributes);
      expect(result.parsedWithExcerpt.attributes.title).toBe("Test Post");

      // The body should be the same
      expect(result.parsedWithExcerpt.body).toBe(result.parsedWithoutExcerpt.body);

      // The excerpt should be correctly extracted
      expect(result.parsedWithExcerpt.excerpt).toBe("\nThis is the excerpt content.\n\n");
      // Without excerpt option, it should be undefined or empty
      expect(result.parsedWithoutExcerpt.excerpt).toBeFalsy();
      });

      it("should handle custom excerpt separators", async () => {
      const contentWithCustomSeparator = `---
title: "Custom Separator Test"
---

This is some intro content.

<!-- more -->

This is the rest of the content that should not be in excerpt.`;

      const program = Effect.gen(function* () {
        const mdx = yield* MdxService;

        const parsed = yield* mdx.parseMdxFile(contentWithCustomSeparator, {
          excerpt: true,
          excerptSeparator: "<!-- more -->",
        });

        return { parsed };
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      // Should extract excerpt up to the custom separator
      expect(result.parsed.excerpt).toBe("\nThis is some intro content.\n\n");
      expect(result.parsed.attributes.title).toBe("Custom Separator Test");
      expect(result.parsed.body).toContain("This is the rest of the content");
    });

    it("should handle content without frontmatter", async () => {
      const contentWithoutFrontmatter = `# Simple MDX File

This file has no frontmatter.

Just regular markdown content.`;

      const program = Effect.gen(function* () {
        const mdx = yield* MdxService;

        const parsed = yield* mdx.parseMdxFile(contentWithoutFrontmatter);
        const html = yield* mdx.compileMdxToHtml(parsed.body);
        const hasFrontmatter = mdx.testForFrontmatter(contentWithoutFrontmatter);

        return { parsed, html, hasFrontmatter };
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      // Should have empty frontmatter
      expect(result.parsed.attributes).toEqual({});
      expect(result.hasFrontmatter).toBe(false);

      // Should still compile content
      expect(result.parsed.body).toContain("# Simple MDX File");
      expect(result.html).toContain("<h1>Simple MDX File</h1>");
    });

    it("should handle empty content gracefully", async () => {
      const program = Effect.gen(function* () {
        const mdx = yield* MdxService;

        const parsed = yield* mdx.parseMdxFile("");
        const html = yield* mdx.compileMdxToHtml(parsed.body);
        const hasFrontmatter = mdx.testForFrontmatter("");

        return { parsed, html, hasFrontmatter };
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      // Should handle empty content
      expect(result.parsed.attributes).toEqual({});
      expect(result.parsed.body).toBe("");
      expect(result.html).toBe("");
      expect(result.hasFrontmatter).toBe(false);
    });

    it("should compile for LLM UI with different frontmatter formats", async () => {
      const program = Effect.gen(function* () {
        const mdx = yield* MdxService;

        const yamlResult = yield* mdx.compileForLlmUi(testBlogContent);
        const jsonContent = `---json
{"title": "JSON Post", "category": "test"}
---

# JSON Content`;
        const jsonResult = yield* mdx.compileForLlmUi(jsonContent);

        return { yamlResult, jsonResult };
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      // YAML result
      expect(result.yamlResult.frontmatter).toEqual({
        title: "My Blog Post",
        author: "John Doe",
        tags: ["react", "mdx"],
        published: true,
      });
      expect(result.yamlResult.rawMarkdown).toContain("# Welcome to My Blog");
      expect(result.yamlResult.metadata).toEqual({ llmUiMode: true });

      // JSON result
      expect(result.jsonResult.frontmatter).toEqual({
        title: "JSON Post",
        category: "test",
      });
      expect(result.jsonResult.rawMarkdown).toContain("# JSON Content");
      expect(result.jsonResult.metadata).toEqual({ llmUiMode: true });
    });

    it("should handle parameter extraction from complex frontmatter", async () => {
      const program = Effect.gen(function* () {
        const mdx = yield* MdxService;

        const content = `---yaml
title: "AI Assistant"
parameters:
  model:
    type: string
    description: "The AI model to use"
    required: true
  temperature:
    type: number
    description: "Creativity level (0-1)"
    default: 0.7
  max_tokens:
    type: number
    description: "Maximum response length"
    required: true
  tools:
    type: array
    description: "Available tools"
    default: []
---

# AI Assistant Prompt

You are a helpful AI assistant.`;

        const parsed = yield* mdx.parseMdxFile(content);
        const parameters = mdx.extractParameters(parsed.attributes);

        return { parsed, parameters };
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result.parameters).toEqual({
        model: {
          type: "string",
          description: "The AI model to use",
          required: true,
        },
        temperature: {
          type: "number",
          description: "Creativity level (0-1)",
          default: 0.7,
        },
        max_tokens: {
          type: "number",
          description: "Maximum response length",
          required: true,
        },
        tools: {
          type: "array",
          description: "Available tools",
          default: [],
        },
      });
    });

    it("should update frontmatter content correctly", async () => {
      const program = Effect.gen(function* () {
        const mdx = yield* MdxService;

        const originalContent = `---
title: Original Title
published: false
---

# Content

Some content here.`;

        const updatedFrontmatter = {
          title: "Updated Title",
          published: true,
          author: "Jane Smith",
        };

        const updatedContent = mdx.updateMdxContent(originalContent, updatedFrontmatter);

        // Parse the updated content to verify
        const parsed = yield* mdx.parseMdxFile(updatedContent);

        return { updatedContent, parsed };
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      // Verify the content was updated correctly
      expect(result.updatedContent).toContain('title: Updated Title');
      expect(result.updatedContent).toContain("published: true");
      expect(result.updatedContent).toContain('author: Jane Smith');
      expect(result.updatedContent).toContain("# Content\n\nSome content here.");

      // Verify parsing works
      expect(result.parsed.attributes).toEqual({
        title: "Updated Title",
        published: true,
        author: "Jane Smith",
      });
    });

    it("should expose gray-matter compatible properties", async () => {
      const program = Effect.gen(function* () {
        const mdx = yield* MdxService;

        // Test with normal frontmatter
        const normalContent = `---
title: Test Title
author: Test Author
---

# Content`;
        const normalParsed = yield* mdx.parseMdxFile(normalContent);

        // Test with empty frontmatter
        const emptyContent = `---
---

# Content`;
        const emptyParsed = yield* mdx.parseMdxFile(emptyContent);

        // Test with no frontmatter
        const noFmContent = `# Content only`;
        const noFmParsed = yield* mdx.parseMdxFile(noFmContent);

        return { normalParsed, emptyParsed, noFmParsed };
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      // Test normal frontmatter
      expect(result.normalParsed.attributes.title).toBe("Test Title");
      expect(result.normalParsed.attributes.author).toBe("Test Author");
      expect(result.normalParsed.stringify).toBeDefined();
      expect(typeof result.normalParsed.stringify).toBe("function");

      // Test stringify function
      const stringified = result.normalParsed.stringify({
        title: "New Title",
        author: "New Author",
      });
      expect(stringified).toContain("---");
      expect(stringified).toContain("title: New Title");
      expect(stringified).toContain("author: New Author");
      expect(stringified).toContain("# Content");

      // Test empty frontmatter (only delimiters)
      expect(result.emptyParsed.attributes).toEqual({});
      // isEmpty should be true for empty frontmatter
      expect(result.emptyParsed.isEmpty).toBe(true);
      expect(result.emptyParsed.empty).toBeDefined();

      // Test no frontmatter
      expect(result.noFmParsed.attributes).toEqual({});
      // No frontmatter means isEmpty is false and empty is undefined
      expect(result.noFmParsed.isEmpty).toBe(false);
      expect(result.noFmParsed.empty).toBeUndefined();
    });

    it("should support round-trip stringify operations", async () => {
      const program = Effect.gen(function* () {
        const mdx = yield* MdxService;

        const originalContent = `---
title: "Original Title"
author: "Original Author"
tags: ["original", "content"]
---

# Original Content

This is the original content.`;

        // Parse the content
        const parsed = yield* mdx.parseMdxFile(originalContent);

        // Modify the frontmatter
        const updatedFrontmatter = {
          ...parsed.attributes,
          title: "Updated Title",
          tags: ["updated", "content", "modified"],
          updatedAt: "2024-01-15",
        };

        // Use the stringify method from the parsed result
        const stringified = parsed.stringify(updatedFrontmatter);

        // Also test the top-level stringify method
        const topLevelStringified = mdx.stringify(parsed.body, updatedFrontmatter);

        return { originalContent, parsed, stringified, topLevelStringified };
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      // Verify the parsed result has the original data
      expect(result.parsed.attributes.title).toBe("Original Title");
      expect(result.parsed.attributes.author).toBe("Original Author");
      expect(result.parsed.attributes.tags).toEqual(["original", "content"]);

      // Verify stringify from parsed result
      expect(result.stringified).toContain("---");
      expect(result.stringified).toContain("title: Updated Title");
      expect(result.stringified).toContain("author: Original Author");
      expect(result.stringified).toContain("updatedAt: '2024-01-15'");
      expect(result.stringified).toContain("# Original Content");

      // Both stringify methods should produce the same result
      expect(result.stringified).toBe(result.topLevelStringified);
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle malformed frontmatter gracefully", async () => {
      const program = Effect.gen(function* () {
        const mdx = yield* MdxService;

        const malformedContent = `---yaml
title: "Test"
invalid: [unclosed
---

Content`;

        return yield* mdx.parseMdxFile(malformedContent);
      });

      await expect(
        Effect.runPromise(program.pipe(Effect.provide(testLayer)))
      ).rejects.toThrow();
    });


  });
});
