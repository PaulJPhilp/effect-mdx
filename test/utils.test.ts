import { Effect, Cause } from "effect";
import { describe, it, expect } from "bun:test";
import {
  toJSONValue,
  sanitizeToMetadata,
  updateMdxContent,
  validateFrontmatterFence,
} from "../src/utils";
import { InvalidMdxFormatError } from "../src/errors";
import type { Frontmatter } from "../src/types";

describe("Utils Module", () => {
  describe("toJSONValue", () => {
    it("should convert null", () => {
      expect(toJSONValue(null)).toBe(null);
    });

    it("should convert strings", () => {
      expect(toJSONValue("hello")).toBe("hello");
      expect(toJSONValue("")).toBe("");
    });

    it("should convert numbers", () => {
      expect(toJSONValue(42)).toBe(42);
      expect(toJSONValue(0)).toBe(0);
      expect(toJSONValue(-1.5)).toBe(-1.5);
    });

    it("should convert booleans", () => {
      expect(toJSONValue(true)).toBe(true);
      expect(toJSONValue(false)).toBe(false);
    });

    it("should convert arrays", () => {
      const input = [1, "two", true, null];
      const output = toJSONValue(input);
      expect(Array.isArray(output)).toBe(true);
      expect(output).toEqual([1, "two", true, null]);
    });

    it("should convert nested arrays", () => {
      const input = [1, [2, [3, 4]]];
      const output = toJSONValue(input);
      expect(output).toEqual([1, [2, [3, 4]]]);
    });

    it("should convert objects", () => {
      const input = { name: "John", age: 30 };
      const output = toJSONValue(input);
      expect(output).toEqual({ name: "John", age: 30 });
    });

    it("should convert nested objects", () => {
      const input = {
        user: {
          name: "John",
          contact: {
            email: "john@example.com",
          },
        },
      };
      const output = toJSONValue(input);
      expect(output).toEqual(input);
    });

    it("should convert mixed nested structures", () => {
      const input = {
        tags: ["typescript", "effect"],
        meta: {
          counts: [1, 2, 3],
          nested: {
            value: true,
          },
        },
      };
      const output = toJSONValue(input);
      expect(output).toEqual(input);
    });

    it("should convert undefined to string", () => {
      expect(toJSONValue(undefined)).toBe("undefined");
    });

    it("should convert functions to strings", () => {
      const fn = () => "test";
      const output = toJSONValue(fn);
      expect(typeof output).toBe("string");
      // Function can be converted to string in various ways
      expect(output.length).toBeGreaterThan(0);
    });

    it("should convert symbols to strings", () => {
      const sym = Symbol("test");
      const output = toJSONValue(sym);
      expect(typeof output).toBe("string");
    });

    it("should handle Date objects", () => {
      const date = new Date("2024-01-01");
      const output = toJSONValue(date);
      // Date is an object, will be converted to object representation
      expect(output).toBeDefined();
    });

    it("should handle objects with methods", () => {
      const obj = {
        value: 42,
        getValue() {
          return this.value;
        },
      };
      const output = toJSONValue(obj) as any;
      expect(output.value).toBe(42);
      expect(typeof output.getValue).toBe("string");
    });
  });

  describe("sanitizeToMetadata", () => {
    it("should sanitize simple object", () => {
      const input = { name: "Test", count: 42 };
      const output = sanitizeToMetadata(input);
      expect(output).toEqual({ name: "Test", count: 42 });
    });

    it("should sanitize nested objects", () => {
      const input = {
        user: {
          name: "John",
          age: 30,
        },
      };
      const output = sanitizeToMetadata(input);
      expect(output).toEqual(input);
    });

    it("should sanitize arrays", () => {
      const input = {
        tags: ["a", "b", "c"],
        numbers: [1, 2, 3],
      };
      const output = sanitizeToMetadata(input);
      expect(output).toEqual(input);
    });

    it("should handle empty object", () => {
      const output = sanitizeToMetadata({});
      expect(output).toEqual({});
    });

    it("should handle null values", () => {
      const input = { value: null };
      const output = sanitizeToMetadata(input);
      expect(output).toEqual({ value: null });
    });

    it("should convert non-JSON values to strings", () => {
      const input = { fn: () => "test" };
      const output = sanitizeToMetadata(input);
      expect(typeof (output as any).fn).toBe("string");
    });
  });

  describe("updateMdxContent", () => {
    it("should update frontmatter", () => {
      const original = `---
title: Original Title
author: John
---

# Content`;

      const updated: Frontmatter = {
        title: "Updated Title",
        author: "Jane",
      };

      const result = updateMdxContent(original, updated);

      expect(result).toContain("title: Updated Title");
      expect(result).toContain("author: Jane");
      expect(result).toContain("# Content");
    });

    it("should preserve body content", () => {
      const original = `---
title: Test
---

# Heading

Paragraph with **bold** and *italic*.

- List item 1
- List item 2`;

      const updated: Frontmatter = {
        title: "New Title",
      };

      const result = updateMdxContent(original, updated);

      expect(result).toContain("# Heading");
      expect(result).toContain("**bold**");
      expect(result).toContain("- List item 1");
    });

    it("should handle content without frontmatter", () => {
      const original = `# Just Content

No frontmatter here.`;

      const updated: Frontmatter = {
        title: "Added Title",
      };

      const result = updateMdxContent(original, updated);

      expect(result).toContain("title: Added Title");
      expect(result).toContain("# Just Content");
    });

    it("should handle empty frontmatter", () => {
      const original = `---
---

# Content`;

      const updated: Frontmatter = {
        title: "New Title",
      };

      const result = updateMdxContent(original, updated);

      expect(result).toContain("title: New Title");
    });

    it("should handle adding new fields", () => {
      const original = `---
title: Test
---

# Content`;

      const updated: Frontmatter = {
        title: "Test",
        author: "John",
        tags: ["typescript", "effect"],
      };

      const result = updateMdxContent(original, updated);

      expect(result).toContain("title: Test");
      expect(result).toContain("author: John");
      expect(result).toContain("tags:");
    });

    it("should handle removing fields", () => {
      const original = `---
title: Test
author: John
tags:
  - typescript
---

# Content`;

      const updated: Frontmatter = {
        title: "Test",
      };

      const result = updateMdxContent(original, updated);

      expect(result).toContain("title: Test");
      expect(result).not.toContain("author: John");
    });

    it("should handle nested objects in frontmatter", () => {
      const original = `---
title: Test
---

# Content`;

      const updated: Frontmatter = {
        title: "Test",
        meta: {
          author: {
            name: "John",
            email: "john@example.com",
          },
        },
      };

      const result = updateMdxContent(original, updated);

      expect(result).toContain("meta:");
      expect(result).toContain("author:");
      expect(result).toContain("name: John");
    });
  });

  describe("validateFrontmatterFence", () => {
    it("should pass valid frontmatter with balanced quotes", () => {
      const valid = `---
title: "Test Title"
author: "John Doe"
---

# Content`;

      expect(() => validateFrontmatterFence(valid)).not.toThrow();
    });

    it("should pass frontmatter without quotes", () => {
      const valid = `---
title: Test Title
author: John Doe
---

# Content`;

      expect(() => validateFrontmatterFence(valid)).not.toThrow();
    });

    it("should fail on unbalanced quotes", () => {
      const invalid = `---
title: "Unclosed quote
author: John
---

# Content`;

      expect(() => validateFrontmatterFence(invalid)).toThrow(InvalidMdxFormatError);
    });

    it("should fail on single unbalanced quote in multiline", () => {
      const invalid = `---
title: Test
description: "This is a
multiline description
without closing quote
---

# Content`;

      expect(() => validateFrontmatterFence(invalid)).toThrow(InvalidMdxFormatError);
    });

    it("should pass with multiple balanced quotes", () => {
      const valid = `---
title: "Test"
description: "A description"
author: "John"
---

# Content`;

      expect(() => validateFrontmatterFence(valid)).not.toThrow();
    });

    it("should pass content without frontmatter", () => {
      const noFrontmatter = `# Just Content

No frontmatter.`;

      expect(() => validateFrontmatterFence(noFrontmatter)).not.toThrow();
    });

    it("should pass empty content", () => {
      expect(() => validateFrontmatterFence("")).not.toThrow();
    });

    it("should handle frontmatter with escaped quotes", () => {
      const valid = `---
title: "Test \\"quoted\\" title"
---

# Content`;

      // This might fail depending on implementation - test actual behavior
      expect(() => validateFrontmatterFence(valid)).not.toThrow();
    });

    it("should pass frontmatter with even number of quotes in different fields", () => {
      const valid = `---
title: "Test"
description: Another "quoted" word
---

# Content`;

      expect(() => validateFrontmatterFence(valid)).not.toThrow();
    });

    it("should handle quotes in YAML strings", () => {
      const valid = `---
title: Test's Title
description: "John's \"test\""
---

# Content`;

      expect(() => validateFrontmatterFence(valid)).not.toThrow();
    });
  });
});
