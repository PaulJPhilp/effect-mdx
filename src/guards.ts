/**
 * Type guards for runtime type checking
 */

import type { Metadata } from "./types.js";

/**
 * Type guard to check if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Type guard to check if a value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

/**
 * Type guard to check if a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/**
 * Type guard to check if a value is an object (non-null, non-array)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if a value is a valid Metadata object
 */
export function isMetadata(value: unknown): value is Metadata {
  return isObject(value);
}

/**
 * Type guard to check if a value is a record with a specific key
 */
export function hasKey<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

/**
 * Type guard to check if a value is a record with a string value at key
 */
export function hasStringKey<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, string> {
  return hasKey(obj, key) && isString(obj[key]);
}

/**
 * Type guard to check if a value is a record with a boolean value at key
 */
export function hasBooleanKey<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, boolean> {
  return hasKey(obj, key) && isBoolean(obj[key]);
}

/**
 * Type guard to check if a value is a record with an object value at key
 */
export function hasObjectKey<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, Record<string, unknown>> {
  return hasKey(obj, key) && isObject(obj[key]);
}
