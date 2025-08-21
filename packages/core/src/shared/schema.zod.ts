import { z } from "zod";

/**
 * Shared schema components used across effects and constraints
 */

/**
 * Utility types for generating valid paths from object types
 */
export type DeepKeys<T> = T extends object
  ? {
      [K in keyof T]-?: K extends string | number
        ? T[K] extends object
          ? `${K}` | `${K}.${DeepKeys<T[K]>}`
          : `${K}`
        : never;
    }[keyof T]
  : never;

/**
 * Get the value type at a specific path
 */
export type PathValue<T, P extends string> = P extends `${infer K}.${infer R}`
  ? K extends keyof T
    ? PathValue<T[K], R>
    : never
  : P extends keyof T
  ? T[P]
  : never;

/**
 * Generic path schema that validates paths against a specific type
 * This provides compile-time type safety for path strings
 * Note: Runtime validation is still string-based, but TypeScript will enforce valid paths
 */
export function createPathSchema<T>() {
  return z
    .string()
    .min(1)
    .describe(
      "Type-safe dot-notation path to the target property"
    ) as unknown as z.ZodType<DeepKeys<T>>;
}

/**
 * Utility function to get a value from an object using dot notation
 */
export function getValueByPath<T>(obj: T, path: string): any {
  return path.split(".").reduce((current: any, key: string) => {
    return current && typeof current === "object" ? current[key] : undefined;
  }, obj);
}

/**
 * Utility function to set a value in an object using dot notation
 */
export function setValueByPath<T>(obj: T, path: string, value: any): T {
  const keys = path.split(".");
  const lastKey = keys.pop()!;

  // Create a deep clone
  const result = JSON.parse(JSON.stringify(obj));

  // Navigate to the parent object
  let current = result;
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key];
  }

  // Set the value
  current[lastKey] = value;
  return result;
}
