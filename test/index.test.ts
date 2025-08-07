import { describe, it, expect } from "bun:test";
import { Effect } from "effect";

describe("effect-mdx", () => {
  it("should work", () => {
    const program = Effect.succeed("Hello, world!");
    const result = Effect.runSync(program);
    expect(result).toBe("Hello, world!");
  });
});
