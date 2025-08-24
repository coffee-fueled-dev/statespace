import { z } from "zod/v4";
import type { System } from "../shared/types";
import type { DeepKeys } from "../shared/lib";

export type SetEffect = z.infer<typeof SetEffectSchema>;
const SetEffectSchema = z
  .object({
    operation: z.literal("set"),
    path: z.string(),
    value: z.any().describe("The value to set at the specified path"),
  })
  .describe("Set the value at the specified path");

export type UnsetEffect = z.infer<typeof UnsetEffectSchema>;
const UnsetEffectSchema = z
  .object({
    operation: z.literal("unset"),
    path: z.string(),
  })
  .describe("Unset the value at the specified path");

export type CopyEffect = z.infer<typeof CopyEffectSchema>;
const CopyEffectSchema = z
  .object({
    operation: z.literal("copy"),
    path: z
      .string()
      .describe("Destination path where the value will be copied"),
    sourcePath: z.string().describe("Source path to copy the value from"),
  })
  .describe("Copy the value from the source path to the destination path");

export type IncrementEffect = z.infer<typeof IncrementEffectSchema>;
const IncrementEffectSchema = z
  .object({
    operation: z.literal("increment"),
    path: z.string().describe("Path to the numeric value to increment"),
    value: z
      .optional(z.number().default(1))
      .describe("Amount to increment by (default: 1)"),
  })
  .describe("Increment the value at the specified path");

export type DecrementEffect = z.infer<typeof DecrementEffectSchema>;
const DecrementEffectSchema = z
  .object({
    operation: z.literal("decrement"),
    path: z.string().describe("Path to the numeric value to decrement"),
    value: z
      .optional(z.number().default(1))
      .describe("Amount to decrement by (default: 1)"),
  })
  .describe("Decrement the value at the specified path");

export type AppendEffect = z.infer<typeof AppendEffectSchema>;
const AppendEffectSchema = z.object({
  operation: z.literal("append"),
  path: z.string().describe("Path to the array to append to"),
  value: z
    .union([z.any(), z.array(z.any())])
    .describe("Item or array of items to append"),
});

export type PrependEffect = z.infer<typeof PrependEffectSchema>;
const PrependEffectSchema = z.object({
  operation: z.literal("prepend"),
  path: z.string().describe("Path to the array to prepend to"),
  value: z
    .union([z.any(), z.array(z.any())])
    .describe("Item or array of items to prepend"),
});

export type RemoveEffect = z.infer<typeof RemoveEffectSchema>;
const RemoveEffectSchema = z.object({
  operation: z.literal("remove"),
  path: z.string().describe("Path to the array to remove items from"),
  value: z.any().describe("Value to remove (exact match) or filter criteria"),
});

export type ClearEffect = z.infer<typeof ClearEffectSchema>;
const ClearEffectSchema = z.object({
  operation: z.literal("clear"),
  path: z.string().describe("Path to the array to clear"),
});

export type MergeEffect = z.infer<typeof MergeEffectSchema>;
const MergeEffectSchema = z.object({
  operation: z.literal("merge"),
  path: z.string().describe("Path to the object to merge properties into"),
  value: z
    .record(z.string(), z.any())
    .describe("Object with properties to merge"),
});

export type TransformEffect<TSystem extends System> =
  | z.infer<typeof TransformEffectSchema>
  | (Omit<z.infer<typeof TransformEffectSchema>, "transformType"> & {
      transformFn: (currentValue: any, originalState: TSystem) => any;
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

export type Effect<TSystem extends System> = (
  | z.infer<typeof EffectSchema>
  | TransformEffect<TSystem>
) & {
  path: DeepKeys<TSystem>;
};
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
  toString: (value: any) => String(value),
  toNumber: (value: any) => Number(value),
  toLowerCase: (value: any) => z.string().parse(value).toLowerCase(),
  toUpperCase: (value: any) => z.string().parse(value).toUpperCase(),
  reverse: (value: any) => z.array(z.any()).parse(value).reverse(),
  sort: (value: any) => z.array(z.any()).parse(value).sort(),
  unique: (value: any) =>
    z
      .array(z.any())
      .parse(value)
      .filter((v, i, a) => a.indexOf(v) === i),
  length: (value: any) => z.array(z.any()).parse(value).length,
} as const;

export function getTransformFunction<TSystem extends System>(
  effect: Effect<TSystem>
) {
  if (effect.operation === "transform") {
    if ("transformType" in effect) {
      const transformFn = TRANSFORM_FUNCTIONS[effect.transformType];
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
