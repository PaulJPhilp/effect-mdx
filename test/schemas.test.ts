import { Effect } from "effect";
import { describe, it, expect } from "bun:test";
import {
  JSONValueSchema,
  MetadataSchema,
  FrontmatterSchema,
  decodeFrontmatter,
  decodeMetadata,
} from "../src/schemas";
import { Schema } from "effect";

describe("Schemas Module", () => {
  describe("JSONValueSchema", () => {
    it("should validate null", async () => {
      const result = await Effect.runPromise(
        Schema.decodeUnknown(JSONValueSchema)(null)
      );
      expect(result).toBe(null);
    });

    it("should validate strings", async () => {
      const result = await Effect.runPromise(
        Schema.decodeUnknown(JSONValueSchema)("hello")
      );
      expect(result).toBe("hello");
    });

    it("should validate numbers", async () => {
      const result = await Effect.runPromise(
        Schema.decodeUnknown(JSONValueSchema)(42)
      );
      expect(result).toBe(42);
    });

    it("should validate booleans", async () => {
      const result = await Effect.runPromise(
        Schema.decodeUnknown(JSONValueSchema)(true)
      );
      expect(result).toBe(true);
    });

    it("should validate arrays", async () => {
      const input = [1, "two", true, null];
      const result = await Effect.runPromise(
        Schema.decodeUnknown(JSONValueSchema)(input)
      );
      expect(result).toEqual(input);
    });

    it("should validate nested arrays", async () => {
      const input = [1, [2, [3, 4]]];
      const result = await Effect.runPromise(
        Schema.decodeUnknown(JSONValueSchema)(input)
      );
      expect(result).toEqual(input);
    });

    it("should validate objects", async () => {
      const input = { name: "John", age: 30 };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(JSONValueSchema)(input)
      );
      expect(result).toEqual(input);
    });

    it("should validate nested objects", async () => {
      const input = {
        user: {
          name: "John",
          contact: {
            email: "john@example.com",
          },
        },
      };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(JSONValueSchema)(input)
      );
      expect(result).toEqual(input);
    });

    it("should validate mixed structures", async () => {
      const input = {
        tags: ["typescript", "effect"],
        meta: {
          count: 42,
          active: true,
          nested: {
            values: [1, 2, 3],
          },
        },
      };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(JSONValueSchema)(input)
      );
      expect(result).toEqual(input);
    });
  });

  describe("MetadataSchema", () => {
    it("should validate empty metadata", async () => {
      const result = await Effect.runPromise(
        Schema.decodeUnknown(MetadataSchema)({})
      );
      expect(result).toEqual({});
    });

    it("should validate simple metadata", async () => {
      const input = { title: "Test", author: "John" };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(MetadataSchema)(input)
      );
      expect(result).toEqual(input);
    });

    it("should validate metadata with various types", async () => {
      const input = {
        title: "Test",
        count: 42,
        active: true,
        tags: ["a", "b"],
      };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(MetadataSchema)(input)
      );
      expect(result).toEqual(input);
    });

    it("should validate nested metadata", async () => {
      const input = {
        meta: {
          author: {
            name: "John",
            email: "john@example.com",
          },
        },
      };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(MetadataSchema)(input)
      );
      expect(result).toEqual(input);
    });

    it("should fail for non-object metadata", async () => {
      const result = await Effect.runPromiseExit(
        Schema.decodeUnknown(MetadataSchema)("not an object")
      );
      expect(result._tag).toBe("Failure");
    });

    it("should fail for array metadata", async () => {
      const result = await Effect.runPromiseExit(
        Schema.decodeUnknown(MetadataSchema)([1, 2, 3])
      );
      expect(result._tag).toBe("Failure");
    });

    it("should fail for null metadata", async () => {
      const result = await Effect.runPromiseExit(
        Schema.decodeUnknown(MetadataSchema)(null)
      );
      expect(result._tag).toBe("Failure");
    });
  });

  describe("FrontmatterSchema", () => {
    it("should validate empty frontmatter", async () => {
      const result = await Effect.runPromise(
        Schema.decodeUnknown(FrontmatterSchema)({})
      );
      expect(result).toEqual({});
    });

    it("should validate frontmatter with optional fields", async () => {
      const input = {
        expectedOutput: "test output",
        expectedError: "test error",
        needsReview: true,
      };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(FrontmatterSchema)(input)
      );
      expect(result.expectedOutput).toBe("test output");
      expect(result.expectedError).toBe("test error");
      expect(result.needsReview).toBe(true);
    });

    it("should validate frontmatter without optional fields", async () => {
      const input = { title: "Test" };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(FrontmatterSchema)(input)
      );
      expect(result.title).toBe("Test");
    });

    it("should validate frontmatter with custom fields", async () => {
      const input = {
        title: "Test",
        author: "John",
        tags: ["typescript", "effect"],
      };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(FrontmatterSchema)(input)
      );
      expect(result).toEqual(input);
    });

    it("should validate frontmatter with nested objects", async () => {
      const input = {
        meta: {
          author: {
            name: "John",
          },
        },
      };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(FrontmatterSchema)(input)
      );
      expect(result).toEqual(input);
    });

    it("should validate only expectedOutput", async () => {
      const input = { expectedOutput: "test" };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(FrontmatterSchema)(input)
      );
      expect(result.expectedOutput).toBe("test");
      expect(result.expectedError).toBeUndefined();
      expect(result.needsReview).toBeUndefined();
    });

    it("should validate only expectedError", async () => {
      const input = { expectedError: "error message" };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(FrontmatterSchema)(input)
      );
      expect(result.expectedError).toBe("error message");
      expect(result.expectedOutput).toBeUndefined();
    });

    it("should validate only needsReview", async () => {
      const input = { needsReview: true };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(FrontmatterSchema)(input)
      );
      expect(result.needsReview).toBe(true);
    });

    it("should fail for non-object frontmatter", async () => {
      const result = await Effect.runPromiseExit(
        Schema.decodeUnknown(FrontmatterSchema)("not an object")
      );
      expect(result._tag).toBe("Failure");
    });
  });

  describe("decodeFrontmatter", () => {
    it("should decode valid frontmatter", async () => {
      const input = { title: "Test", author: "John" };
      const result = await Effect.runPromise(decodeFrontmatter(input));
      expect(result).toEqual(input);
    });

    it("should decode frontmatter with optional fields", async () => {
      const input = {
        title: "Test",
        expectedOutput: "output",
        needsReview: false,
      };
      const result = await Effect.runPromise(decodeFrontmatter(input));
      expect(result.title).toBe("Test");
      expect(result.expectedOutput).toBe("output");
      expect(result.needsReview).toBe(false);
    });

    it("should fail for invalid frontmatter", async () => {
      const result = await Effect.runPromiseExit(
        decodeFrontmatter("invalid")
      );
      expect(result._tag).toBe("Failure");
    });

    it("should handle empty frontmatter", async () => {
      const result = await Effect.runPromise(decodeFrontmatter({}));
      expect(result).toEqual({});
    });
  });

  describe("decodeMetadata", () => {
    it("should decode valid metadata", async () => {
      const input = { key: "value", count: 42 };
      const result = await Effect.runPromise(decodeMetadata(input));
      expect(result).toEqual(input);
    });

    it("should decode nested metadata", async () => {
      const input = {
        nested: {
          deep: {
            value: "test",
          },
        },
      };
      const result = await Effect.runPromise(decodeMetadata(input));
      expect(result).toEqual(input);
    });

    it("should fail for invalid metadata", async () => {
      const result = await Effect.runPromiseExit(decodeMetadata("invalid"));
      expect(result._tag).toBe("Failure");
    });

    it("should fail for array metadata", async () => {
      const result = await Effect.runPromiseExit(decodeMetadata([1, 2, 3]));
      expect(result._tag).toBe("Failure");
    });

    it("should handle empty metadata", async () => {
      const result = await Effect.runPromise(decodeMetadata({}));
      expect(result).toEqual({});
    });
  });

  describe("Integration with gray-matter data", () => {
    it("should validate typical gray-matter output", async () => {
      // Simulate what gray-matter would return
      const grayMatterData = {
        title: "My Post",
        date: "2024-01-01",
        tags: ["typescript", "effect"],
        draft: false,
      };

      const result = await Effect.runPromise(
        decodeFrontmatter(grayMatterData)
      );

      expect(result.title).toBe("My Post");
      expect(result.tags).toEqual(["typescript", "effect"]);
      expect(result.draft).toBe(false);
    });

    it("should validate complex gray-matter output", async () => {
      const grayMatterData = {
        title: "Complex Post",
        author: {
          name: "John Doe",
          email: "john@example.com",
        },
        tags: ["typescript", "effect", "mdx"],
        meta: {
          readTime: 5,
          difficulty: "intermediate",
        },
      };

      const result = await Effect.runPromise(
        decodeFrontmatter(grayMatterData)
      );

      expect(result.title).toBe("Complex Post");
      expect((result.author as any).name).toBe("John Doe");
      expect((result.meta as any).readTime).toBe(5);
    });
  });
});
