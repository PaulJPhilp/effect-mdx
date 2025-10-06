import matter from "gray-matter";
import type { JSONValue, Metadata, Frontmatter } from "./types.js";
import { InvalidMdxFormatError } from "./errors.js";

/**
 * Convert arbitrary unknown into a JSON-compatible value.
 */
export const toJSONValue = (v: unknown): JSONValue => {
  if (
    v === null ||
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean"
  ) {
    return v;
  }
  if (Array.isArray(v)) {
    return v.map(toJSONValue);
  }
  if (typeof v === "object") {
    const out: Record<string, JSONValue> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      const jv = toJSONValue(val);
      out[k] = jv;
    }
    return out;
  }
  return String(v);
};

/**
 * Coerce a record of unknowns into Metadata (JSONObject).
 */
export const sanitizeToMetadata = (rec: Record<string, unknown>): Metadata => {
  return toJSONValue(rec) as Metadata;
};

/**
 * Reconstruct MDX content with updated frontmatter.
 */
export const updateMdxContent = (
  originalFullMdxContent: string,
  updatedFrontmatter: Frontmatter
): string => {
  const { content: originalBody } = matter(originalFullMdxContent);
  const newFrontmatterStr = matter.stringify(originalBody, updatedFrontmatter);
  return newFrontmatterStr;
};

/**
 * Validate that a YAML frontmatter fence appears balanced enough before
 * parsing. This is a heuristic to catch obvious malformed cases
 * consistently across environments.
 *
 * @throws InvalidMdxFormatError when unbalanced quotes are detected.
 */
export const validateFrontmatterFence = (content: string): void => {
  if (content.startsWith("---")) {
    const end = content.indexOf("\n---", 3);
    if (end > 0) {
      const fm = content.slice(3, end);
      const dq = fm.match(/"/g)?.length ?? 0;
      if (dq > 0 && dq % 2 === 1) {
        throw new InvalidMdxFormatError({
          reason: "Unbalanced quotes detected in frontmatter",
        });
      }
    }
  }
};
