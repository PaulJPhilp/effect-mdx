import { Schema } from "effect";
import type { Frontmatter, Metadata } from "./types";

/**
 * Schema for JSON primitive values
 */
const JSONPrimitiveSchema = Schema.Union(
  Schema.String,
  Schema.Number,
  Schema.Boolean,
  Schema.Null
);

/**
 * Schema for JSON values (recursive)
 */
export const JSONValueSchema: Schema.Schema<any, any> = Schema.suspend(() =>
  Schema.Union(
    JSONPrimitiveSchema,
    Schema.Array(JSONValueSchema),
    Schema.Record({ key: Schema.String, value: JSONValueSchema })
  )
);

/**
 * Schema for Metadata (JSON object)
 */
export const MetadataSchema: Schema.Schema<Metadata> = Schema.Record({
  key: Schema.String,
  value: JSONValueSchema,
});

/**
 * Schema for Frontmatter with optional testing fields
 */
export const FrontmatterSchema: Schema.Schema<Frontmatter> = Schema.Struct({
  expectedOutput: Schema.optional(Schema.String),
  expectedError: Schema.optional(Schema.String),
  needsReview: Schema.optional(Schema.Boolean),
}).pipe(
  Schema.extend(
    Schema.Record({ key: Schema.String, value: JSONValueSchema })
  )
);

/**
 * Decode and validate frontmatter from unknown data
 */
export const decodeFrontmatter = Schema.decodeUnknown(FrontmatterSchema);

/**
 * Decode and validate metadata from unknown data
 */
export const decodeMetadata = Schema.decodeUnknown(MetadataSchema);
