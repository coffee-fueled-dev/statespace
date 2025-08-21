import { z } from "zod";
import { createPathSchema, type DeepKeys } from "../shared/schema.zod";

// Conditions removed - use transition constraints instead

/**
 * Type-safe effect schema factory
 * Creates effect schemas with compile-time path validation for a specific state type
 */
export function createEffectSchemas<TSystem>() {
  const PathSchema = createPathSchema<TSystem>();

  const SetEffectSchema = z.object({
    operation: z.literal("set"),
    path: PathSchema,
    value: z.any().describe("The value to set at the specified path"),
  });

  const UnsetEffectSchema = z.object({
    operation: z.literal("unset"),
    path: PathSchema,
  });

  const CopyEffectSchema = z.object({
    operation: z.literal("copy"),
    path: PathSchema.describe(
      "Destination path where the value will be copied"
    ),
    sourcePath: PathSchema.describe("Source path to copy the value from"),
  });

  const IncrementEffectSchema = z.object({
    operation: z.literal("increment"),
    path: PathSchema.describe("Path to the numeric value to increment"),
    value: z
      .number()
      .optional()
      .default(1)
      .describe("Amount to increment by (default: 1)"),
  });

  const DecrementEffectSchema = z.object({
    operation: z.literal("decrement"),
    path: PathSchema.describe("Path to the numeric value to decrement"),
    value: z
      .number()
      .optional()
      .default(1)
      .describe("Amount to decrement by (default: 1)"),
  });

  const AppendEffectSchema = z.object({
    operation: z.literal("append"),
    path: PathSchema.describe("Path to the array to append to"),
    value: z
      .union([z.any(), z.array(z.any())])
      .describe("Item or array of items to append"),
  });

  const PrependEffectSchema = z.object({
    operation: z.literal("prepend"),
    path: PathSchema.describe("Path to the array to prepend to"),
    value: z
      .union([z.any(), z.array(z.any())])
      .describe("Item or array of items to prepend"),
  });

  const RemoveEffectSchema = z.object({
    operation: z.literal("remove"),
    path: PathSchema.describe("Path to the array to remove items from"),
    value: z.any().describe("Value to remove (exact match) or filter criteria"),
  });

  const ClearEffectSchema = z.object({
    operation: z.literal("clear"),
    path: PathSchema.describe("Path to the array to clear"),
  });

  const MergeEffectSchema = z.object({
    operation: z.literal("merge"),
    path: PathSchema.describe("Path to the object to merge properties into"),
    value: z
      .record(z.string(), z.any())
      .describe("Object with properties to merge"),
  });

  const TransformEffectSchema = z.object({
    operation: z.literal("transform"),
    path: PathSchema.describe("Path to the value to transform"),
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

  const EffectInstructionSchema = z.discriminatedUnion("operation", [
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

  const EffectDefinitionSchema = z
    .object({
      instructions: z
        .array(EffectInstructionSchema)
        .min(1)
        .describe("Array of effect instructions to apply in sequence"),
    })
    .describe("Complete effect definition with one or more instructions");

  const SingleEffectSchema = EffectInstructionSchema.describe(
    "Single effect instruction"
  );

  const EffectSchema = z
    .union([SingleEffectSchema, EffectDefinitionSchema])
    .describe(
      "Effect configuration - either a single instruction or multiple instructions"
    );

  return {
    PathSchema,
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
    EffectInstructionSchema,
    EffectDefinitionSchema,
    SingleEffectSchema,
    EffectSchema,
  };
}

/**
 * Default effect schemas (for backward compatibility)
 * Uses generic path validation - paths are typed as string but still validated at runtime
 */
const defaultSchemas = createEffectSchemas<any>();

export const EffectInstructionSchema = defaultSchemas.EffectInstructionSchema;
export const EffectDefinitionSchema = defaultSchemas.EffectDefinitionSchema;
export const SingleEffectSchema = defaultSchemas.SingleEffectSchema;
export const EffectSchema = defaultSchemas.EffectSchema;

/**
 * Type exports for TypeScript integration
 */
export type JsonEffectInstruction = z.infer<typeof EffectInstructionSchema>;
export type JsonEffectDefinition = z.infer<typeof EffectDefinitionSchema>;
export type EffectConfig = z.infer<typeof EffectSchema>;

// Re-export individual operation types for better type inference
export type SetEffectInstruction = z.infer<
  typeof defaultSchemas.SetEffectSchema
>;
export type IncrementEffectInstruction = z.infer<
  typeof defaultSchemas.IncrementEffectSchema
>;
export type DecrementEffectInstruction = z.infer<
  typeof defaultSchemas.DecrementEffectSchema
>;
export type AppendEffectInstruction = z.infer<
  typeof defaultSchemas.AppendEffectSchema
>;
export type PrependEffectInstruction = z.infer<
  typeof defaultSchemas.PrependEffectSchema
>;
export type RemoveEffectInstruction = z.infer<
  typeof defaultSchemas.RemoveEffectSchema
>;
export type ClearEffectInstruction = z.infer<
  typeof defaultSchemas.ClearEffectSchema
>;
export type MergeEffectInstruction = z.infer<
  typeof defaultSchemas.MergeEffectSchema
>;
export type TransformEffectInstruction = z.infer<
  typeof defaultSchemas.TransformEffectSchema
>;
export type UnsetEffectInstruction = z.infer<
  typeof defaultSchemas.UnsetEffectSchema
>;
export type CopyEffectInstruction = z.infer<
  typeof defaultSchemas.CopyEffectSchema
>;

/**
 * Predefined transform functions for JSON-based transforms
 */
const TRANSFORM_FUNCTIONS = {
  toString: (value: any) => String(value),
  toNumber: (value: any) => Number(value),
  toLowerCase: (value: any) => String(value).toLowerCase(),
  toUpperCase: (value: any) => String(value).toUpperCase(),
  reverse: (value: any[]) => [...value].reverse(),
  sort: (value: any[]) => [...value].sort(),
  unique: (value: any[]) => [...new Set(value)],
  length: (value: any[] | string) => value.length,
} as const;

/**
 * Convert a JSON effect instruction to internal format
 */
function convertInstruction(instruction: JsonEffectInstruction): any {
  const baseInstruction = {
    path: instruction.path,
    operation: instruction.operation,
  };

  switch (instruction.operation) {
    case "set":
    case "increment":
    case "decrement":
    case "append":
    case "prepend":
    case "remove":
    case "merge":
      return {
        ...baseInstruction,
        value: instruction.value,
      };

    case "copy":
      return {
        ...baseInstruction,
        sourcePath: instruction.sourcePath,
      };

    case "transform":
      const transformFn = TRANSFORM_FUNCTIONS[instruction.transformType];
      if (!transformFn) {
        throw new Error(`Unknown transform type: ${instruction.transformType}`);
      }
      return {
        ...baseInstruction,
        transformFn: (currentValue: any) => transformFn(currentValue),
      };

    case "unset":
    case "clear":
      return baseInstruction;

    default:
      throw new Error(`Unknown operation: ${(instruction as any).operation}`);
  }
}

/**
 * Create an effect function from a validated JSON configuration
 */
export function createEffectFromConfig<TSystem>(
  config: EffectConfig
): (state: TSystem) => TSystem {
  // Import the builder dynamically to avoid circular dependencies
  const { effect } = require("./builder");

  // Validate the config
  const validatedConfig = EffectSchema.parse(config);

  // Normalize to array of instructions
  const instructions =
    "instructions" in validatedConfig
      ? validatedConfig.instructions
      : [validatedConfig];

  // Convert to internal format and build effect
  const builder = effect();

  for (const instruction of instructions) {
    const converted = convertInstruction(instruction);
    builder.addInstruction(converted);
  }

  return builder.build();
}
