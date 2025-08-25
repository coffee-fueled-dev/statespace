import type { Schema, Validation } from "./schema.zod";

// Helper type to extract the shape from array requirements
type ExtractArrayShape<TRequire> = TRequire extends readonly (infer TReq)[]
  ? TReq extends { operator: "shape"; value: infer TShape }
    ? TShape extends Validation
      ? Validated<TShape>
      : unknown
    : never
  : never;

/**
 * Converts a single Validation schema to its corresponding TypeScript type
 * @example
 * type StringType = Validated<{ type: "string" }>; // string
 * type ObjectType = Validated<{ type: "object", require: { name: { type: "string" } } }>; // { name: string }
 */
export type Validated<TValidation extends Validation> = TValidation extends {
  type: "string";
}
  ? string
  : TValidation extends { type: "number" }
  ? number
  : TValidation extends { type: "boolean" }
  ? boolean
  : TValidation extends { type: "date" }
  ? Date
  : TValidation extends { type: "null" }
  ? null
  : TValidation extends { type: "undefined" }
  ? undefined
  : TValidation extends { type: "array"; require: infer TRequire }
  ? ExtractArrayShape<TRequire> extends never
    ? unknown[] // Array without shape operator
    : ExtractArrayShape<TRequire>[] // Typed array with shape
  : TValidation extends { type: "array" }
  ? unknown[] // Array without require
  : TValidation extends { type: "object"; require: infer TRequire }
  ? TRequire extends Record<string, Validation>
    ? {
        [K in keyof TRequire as TRequire[K] extends { type: "undefined" }
          ? never
          : K]: TRequire[K] extends { type: "undefined" }
          ? never
          : Validated<TRequire[K]>;
      } & {
        [K in keyof TRequire as TRequire[K] extends { type: "undefined" }
          ? K
          : never]?: Validated<TRequire[K]>;
      }
    : Record<string, unknown>
  : TValidation extends { type: "object" }
  ? Record<string, unknown>
  : unknown;

/**
 * Converts a StatespaceSystem schema (nested validation structure) to its corresponding TypeScript type
 * @example
 * type SystemType = Shape<{
 *   frontend: { user: { type: "string" } },
 *   backend: { posts: { type: "array" } }
 * }>; // { frontend: { user: string }, backend: { posts: unknown[] } }
 */
export type Shape<TSchema extends Schema> = {
  [K in keyof TSchema]: TSchema[K] extends { type: string }
    ? // @ts-ignore - Type constraint is overly strict but inference works correctly
      Validated<TSchema[K]>
    : TSchema[K] extends Record<string, any>
    ? {
        [NK in keyof TSchema[K]]: TSchema[K][NK] extends {
          type: string;
        }
          ? Validated<TSchema[K][NK]>
          : unknown;
      }
    : unknown;
};
