import { describe, it, expect } from "bun:test";
import {
  isString,
  isNumber,
  isBoolean,
  isObject,
  isMetadata,
  hasKey,
  hasStringKey,
  hasBooleanKey,
  hasObjectKey,
} from "../src/guards";

describe("Guards Module", () => {
  describe("isString", () => {
    it("should return true for strings", () => {
      expect(isString("hello")).toBe(true);
      expect(isString("")).toBe(true);
      expect(isString(String("test"))).toBe(true);
    });

    it("should return false for non-strings", () => {
      expect(isString(123)).toBe(false);
      expect(isString(true)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString([])).toBe(false);
    });
  });

  describe("isNumber", () => {
    it("should return true for numbers", () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(42)).toBe(true);
      expect(isNumber(-1)).toBe(true);
      expect(isNumber(3.14)).toBe(true);
      expect(isNumber(Number(5))).toBe(true);
    });

    it("should return true for special number values", () => {
      expect(isNumber(NaN)).toBe(true);
      expect(isNumber(Infinity)).toBe(true);
      expect(isNumber(-Infinity)).toBe(true);
    });

    it("should return false for non-numbers", () => {
      expect(isNumber("123")).toBe(false);
      expect(isNumber(true)).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber(undefined)).toBe(false);
      expect(isNumber({})).toBe(false);
      expect(isNumber([])).toBe(false);
    });
  });

  describe("isBoolean", () => {
    it("should return true for booleans", () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
      expect(isBoolean(Boolean(1))).toBe(true);
    });

    it("should return false for non-booleans", () => {
      expect(isBoolean(1)).toBe(false);
      expect(isBoolean(0)).toBe(false);
      expect(isBoolean("true")).toBe(false);
      expect(isBoolean(null)).toBe(false);
      expect(isBoolean(undefined)).toBe(false);
      expect(isBoolean({})).toBe(false);
      expect(isBoolean([])).toBe(false);
    });
  });

  describe("isObject", () => {
    it("should return true for plain objects", () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: "value" })).toBe(true);
      expect(isObject({ nested: { value: 1 } })).toBe(true);
    });

    it("should return true for object instances", () => {
      expect(isObject(new Date())).toBe(true);
      expect(isObject(new Error())).toBe(true);
    });

    it("should return false for arrays", () => {
      expect(isObject([])).toBe(false);
      expect(isObject([1, 2, 3])).toBe(false);
    });

    it("should return false for null", () => {
      expect(isObject(null)).toBe(false);
    });

    it("should return false for primitives", () => {
      expect(isObject("string")).toBe(false);
      expect(isObject(123)).toBe(false);
      expect(isObject(true)).toBe(false);
      expect(isObject(undefined)).toBe(false);
    });
  });

  describe("isMetadata", () => {
    it("should return true for valid metadata objects", () => {
      expect(isMetadata({})).toBe(true);
      expect(isMetadata({ key: "value" })).toBe(true);
      expect(isMetadata({ nested: { data: true } })).toBe(true);
    });

    it("should return false for non-objects", () => {
      expect(isMetadata(null)).toBe(false);
      expect(isMetadata([])).toBe(false);
      expect(isMetadata("string")).toBe(false);
      expect(isMetadata(123)).toBe(false);
    });
  });

  describe("hasKey", () => {
    it("should return true when key exists", () => {
      const obj = { name: "John", age: 30 };
      expect(hasKey(obj, "name")).toBe(true);
      expect(hasKey(obj, "age")).toBe(true);
    });

    it("should return false when key doesn't exist", () => {
      const obj = { name: "John" };
      expect(hasKey(obj, "age")).toBe(false);
      expect(hasKey(obj, "missing")).toBe(false);
    });

    it("should return true for keys with undefined values", () => {
      const obj = { key: undefined };
      expect(hasKey(obj, "key")).toBe(true);
    });

    it("should return true for keys with null values", () => {
      const obj = { key: null };
      expect(hasKey(obj, "key")).toBe(true);
    });

    it("should return false for non-objects", () => {
      expect(hasKey(null, "key")).toBe(false);
      expect(hasKey(undefined, "key")).toBe(false);
      expect(hasKey("string", "key")).toBe(false);
      expect(hasKey(123, "key")).toBe(false);
    });

    it("should return false for arrays", () => {
      expect(hasKey([1, 2, 3], "length")).toBe(false);
    });

    it("should handle nested keys correctly", () => {
      const obj = { outer: { inner: "value" } };
      expect(hasKey(obj, "outer")).toBe(true);
      expect(hasKey(obj, "inner")).toBe(false);
    });
  });

  describe("hasStringKey", () => {
    it("should return true when key exists with string value", () => {
      const obj = { name: "John", age: 30 };
      expect(hasStringKey(obj, "name")).toBe(true);
    });

    it("should return false when key exists with non-string value", () => {
      const obj = { name: "John", age: 30 };
      expect(hasStringKey(obj, "age")).toBe(false);
    });

    it("should return false when key doesn't exist", () => {
      const obj = { name: "John" };
      expect(hasStringKey(obj, "missing")).toBe(false);
    });

    it("should return false for null values", () => {
      const obj = { key: null };
      expect(hasStringKey(obj, "key")).toBe(false);
    });

    it("should return false for undefined values", () => {
      const obj = { key: undefined };
      expect(hasStringKey(obj, "key")).toBe(false);
    });

    it("should return false for empty string (but key exists)", () => {
      const obj = { key: "" };
      expect(hasStringKey(obj, "key")).toBe(true);
    });

    it("should narrow type correctly", () => {
      const obj: unknown = { name: "John", age: 30 };
      if (hasStringKey(obj, "name")) {
        // TypeScript should know obj.name is string
        const name: string = obj.name;
        expect(name).toBe("John");
      }
    });
  });

  describe("hasBooleanKey", () => {
    it("should return true when key exists with boolean value", () => {
      const obj = { active: true, count: 5 };
      expect(hasBooleanKey(obj, "active")).toBe(true);
    });

    it("should return false when key exists with non-boolean value", () => {
      const obj = { active: true, count: 5 };
      expect(hasBooleanKey(obj, "count")).toBe(false);
    });

    it("should return false when key doesn't exist", () => {
      const obj = { active: true };
      expect(hasBooleanKey(obj, "missing")).toBe(false);
    });

    it("should handle false values", () => {
      const obj = { disabled: false };
      expect(hasBooleanKey(obj, "disabled")).toBe(true);
    });

    it("should return false for truthy non-boolean values", () => {
      const obj = { value: 1 };
      expect(hasBooleanKey(obj, "value")).toBe(false);
    });

    it("should return false for falsy non-boolean values", () => {
      const obj = { value: 0 };
      expect(hasBooleanKey(obj, "value")).toBe(false);
    });

    it("should narrow type correctly", () => {
      const obj: unknown = { active: true, name: "test" };
      if (hasBooleanKey(obj, "active")) {
        const active: boolean = obj.active;
        expect(active).toBe(true);
      }
    });
  });

  describe("hasObjectKey", () => {
    it("should return true when key exists with object value", () => {
      const obj = { meta: { name: "John" }, count: 5 };
      expect(hasObjectKey(obj, "meta")).toBe(true);
    });

    it("should return false when key exists with non-object value", () => {
      const obj = { meta: { name: "John" }, count: 5 };
      expect(hasObjectKey(obj, "count")).toBe(false);
    });

    it("should return false when key doesn't exist", () => {
      const obj = { meta: {} };
      expect(hasObjectKey(obj, "missing")).toBe(false);
    });

    it("should return false for array values", () => {
      const obj = { items: [1, 2, 3] };
      expect(hasObjectKey(obj, "items")).toBe(false);
    });

    it("should return false for null values", () => {
      const obj = { value: null };
      expect(hasObjectKey(obj, "value")).toBe(false);
    });

    it("should return true for nested objects", () => {
      const obj = {
        outer: {
          inner: {
            deep: "value",
          },
        },
      };
      expect(hasObjectKey(obj, "outer")).toBe(true);
    });

    it("should return true for empty objects", () => {
      const obj = { empty: {} };
      expect(hasObjectKey(obj, "empty")).toBe(true);
    });

    it("should return true for Date objects", () => {
      const obj = { date: new Date() };
      expect(hasObjectKey(obj, "date")).toBe(true);
    });

    it("should narrow type correctly", () => {
      const obj: unknown = { meta: { count: 5 }, name: "test" };
      if (hasObjectKey(obj, "meta")) {
        const meta: Record<string, unknown> = obj.meta;
        expect(meta.count).toBe(5);
      }
    });
  });

  describe("Type narrowing integration", () => {
    it("should narrow unknown to specific types progressively", () => {
      const data: unknown = {
        name: "John",
        age: 30,
        active: true,
        meta: { role: "admin" },
      };

      if (isObject(data)) {
        // data is now Record<string, unknown>
        if (hasStringKey(data, "name")) {
          expect(data.name).toBe("John");
        }
        if (hasStringKey(data, "age")) {
          // This should fail - age is number
          expect(false).toBe(true);
        } else {
          // age is not string
          expect(true).toBe(true);
        }
        if (hasBooleanKey(data, "active")) {
          expect(data.active).toBe(true);
        }
        if (hasObjectKey(data, "meta")) {
          expect(data.meta.role).toBe("admin");
        }
      }
    });

    it("should handle optional keys safely", () => {
      const data: { name?: string; age?: number } = { name: "John" };

      if (hasStringKey(data, "name")) {
        expect(data.name).toBe("John");
      }
      expect(hasStringKey(data, "age")).toBe(false);
    });
  });
});
