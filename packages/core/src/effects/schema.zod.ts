import { z } from "zod";
import type { DeepKeys, PathValue } from "../shared/lib";
import { SerializableSchema } from "../shared/schema.zod";
import type { Schema, Shape } from "../schema";

export type SetEffect<TShape extends Shape<Schema>> = Omit<
  z.infer<typeof SetEffectSchema>,
  "path"
> & {
  path: DeepKeys<TShape>;
};
const SetEffectSchema = z
  .object({
    operation: z.literal("set"),
    path: z.string(),
    value: SerializableSchema.describe(
      "The value to set at the specified path"
    ),
  })
  .describe("Set the value at the specified path");

export type UnsetEffect<TShape extends Shape<Schema>> = Omit<
  z.infer<typeof UnsetEffectSchema>,
  "path"
> & {
  path: DeepKeys<TShape>;
};
const UnsetEffectSchema = z
  .object({
    operation: z.literal("unset"),
    path: z.string(),
  })
  .describe("Unset the value at the specified path");

export type CopyEffect<TShape extends Shape<Schema>> = Omit<
  z.infer<typeof CopyEffectSchema>,
  "path" | "sourcePath"
> & {
  path: DeepKeys<TShape>;
  sourcePath: DeepKeys<TShape>;
};
const CopyEffectSchema = z
  .object({
    operation: z.literal("copy"),
    path: z
      .string()
      .describe("Destination path where the value will be copied"),
    sourcePath: z.string().describe("Source path to copy the value from"),
  })
  .describe("Copy the value from the source path to the destination path");

export type IncrementEffect<TShape extends Shape<Schema>> = Omit<
  z.infer<typeof IncrementEffectSchema>,
  "path"
> & {
  path: DeepKeys<TShape>;
};
const IncrementEffectSchema = z
  .object({
    operation: z.literal("increment"),
    path: z.string().describe("Path to the numeric value to increment"),
    value: z
      .number()
      .default(1)
      .nullish()
      .describe("Amount to increment by (default: 1)"),
  })
  .describe("Increment the value at the specified path");

export type DecrementEffect<TShape extends Shape<Schema>> = Omit<
  z.infer<typeof DecrementEffectSchema>,
  "path"
> & {
  path: DeepKeys<TShape>;
};
const DecrementEffectSchema = z
  .object({
    operation: z.literal("decrement"),
    path: z.string().describe("Path to the numeric value to decrement"),
    value: z
      .number()
      .default(1)
      .nullish()
      .describe("Amount to decrement by (default: 1)"),
  })
  .describe("Decrement the value at the specified path");

export type AppendEffect<TShape extends Shape<Schema>> = Omit<
  z.infer<typeof AppendEffectSchema>,
  "path"
> & {
  path: DeepKeys<TShape>;
};
const AppendEffectSchema = z.object({
  operation: z.literal("append"),
  path: z.string().describe("Path to the array to append to"),
  value: SerializableSchema.describe("Item or array of items to append"),
});

export type PrependEffect<TShape extends Shape<Schema>> = Omit<
  z.infer<typeof PrependEffectSchema>,
  "path"
> & {
  path: DeepKeys<TShape>;
};
const PrependEffectSchema = z.object({
  operation: z.literal("prepend"),
  path: z.string().describe("Path to the array to prepend to"),
  value: SerializableSchema.describe("Item or array of items to prepend"),
});

export type RemoveEffect<TShape extends Shape<Schema>> = Omit<
  z.infer<typeof RemoveEffectSchema>,
  "path"
> & {
  path: DeepKeys<TShape>;
};
const RemoveEffectSchema = z.object({
  operation: z.literal("remove"),
  path: z.string().describe("Path to the array to remove items from"),
  value: SerializableSchema.describe(
    "Value to remove (exact match) or filter criteria"
  ),
});

export type ClearEffect<TShape extends Shape<Schema>> = Omit<
  z.infer<typeof ClearEffectSchema>,
  "path"
> & {
  path: DeepKeys<TShape>;
};
const ClearEffectSchema = z.object({
  operation: z.literal("clear"),
  path: z.string().describe("Path to the array to clear"),
});

export type MergeEffect<TShape extends Shape<Schema>> = Omit<
  z.infer<typeof MergeEffectSchema>,
  "path"
> & {
  path: DeepKeys<TShape>;
};
const MergeEffectSchema = z.object({
  operation: z.literal("merge"),
  path: z.string().describe("Path to the object to merge properties into"),
  value: z
    .record(z.string(), SerializableSchema)
    .describe("Object with properties to merge"),
});

export type TransformEffect<TShape extends Shape<Schema>> =
  | (Omit<z.infer<typeof TransformEffectSchema>, "path"> & {
      path: DeepKeys<TShape>;
    })
  | (Omit<z.infer<typeof TransformEffectSchema>, "transformType" | "path"> & {
      path: DeepKeys<TShape>;
      transformFn: (currentValue: any, originalState: TShape) => any;
    });
export const TransformEffectSchema = z.object({
  operation: z.literal("transform"),
  path: z.string().describe("Path to the value to transform"),
  transformType: z
    .enum([
      "toString",
      "toNumber",
      "toLowerCase",
      "toUpperCase",
      "reverse",
      "sort",
      "unique",
      "length",
    ])
    .describe("Predefined transformation to apply"),
});

export type Effect<TSchema extends Schema> =
  | SetEffect<Shape<TSchema>>
  | UnsetEffect<Shape<TSchema>>
  | CopyEffect<Shape<TSchema>>
  | IncrementEffect<Shape<TSchema>>
  | DecrementEffect<Shape<TSchema>>
  | AppendEffect<Shape<TSchema>>
  | PrependEffect<Shape<TSchema>>
  | RemoveEffect<Shape<TSchema>>
  | ClearEffect<Shape<TSchema>>
  | MergeEffect<Shape<TSchema>>
  | TransformEffect<Shape<TSchema>>;
export const EffectSchema = z.discriminatedUnion("operation", [
  SetEffectSchema,
  UnsetEffectSchema,
  CopyEffectSchema,
  IncrementEffectSchema,
  DecrementEffectSchema,
  AppendEffectSchema,
  PrependEffectSchema,
  RemoveEffectSchema,
  ClearEffectSchema,
  MergeEffectSchema,
  TransformEffectSchema,
]);

const TRANSFORM_FUNCTIONS = {
  toString: (value: Shape<Schema>) => String(value),
  toNumber: (value: Shape<Schema>) => Number(value),
  toLowerCase: (value: Shape<Schema>) => z.string().parse(value).toLowerCase(),
  toUpperCase: (value: Shape<Schema>) => z.string().parse(value).toUpperCase(),
  reverse: (value: Shape<Schema>) =>
    z.array(SerializableSchema).parse(value).reverse(),
  sort: (value: Shape<Schema>) =>
    z.array(SerializableSchema).parse(value).sort(),
  unique: (value: Shape<Schema>) =>
    z
      .array(SerializableSchema)
      .parse(value)
      .filter((v, i, a) => a.indexOf(v) === i),
  length: (value: Shape<Schema>) =>
    z.array(SerializableSchema).parse(value).length,
} as const;

export function getTransformFunction<TSchema extends Schema>(
  effect: Effect<TSchema>
) {
  if (effect.operation === "transform") {
    if ("transformType" in effect) {
      const transformFn =
        TRANSFORM_FUNCTIONS[
          effect.transformType as keyof typeof TRANSFORM_FUNCTIONS
        ];
      if (!transformFn) {
        throw new Error(`Unknown transform type: ${effect.transformType}`);
      }
      return (currentValue: any) => transformFn(currentValue);
    } else {
      return effect.transformFn;
    }
  } else {
    throw new Error(
      "getTransformFunction must be called on a transform operation"
    );
  }
}
