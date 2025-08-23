import type { System } from "../types";
import type { DeepKeys, PathValue } from "../shared/schema.zod";
import type { JsonEffectInstruction } from "./schema.zod";

/**
 * Effect operation types - inferred from Zod schema
 */
export type EffectOperation = JsonEffectInstruction["operation"];

/**
 * Transform types - inferred from Zod schema transform operation
 */
export type TransformType = Extract<
  JsonEffectInstruction,
  { operation: "transform" }
>["transformType"];

/**
 * Enhanced effect instruction with type-safe paths and optional custom transform functions
 * NOTE: Conditions removed - use transition constraints instead
 */
export interface EffectInstruction<TSystem extends System> {
  path: DeepKeys<TSystem>;
  operation: EffectOperation;
  value?: any;
  sourcePath?: DeepKeys<TSystem>;
  transformFn?: (
    currentValue: any, // We can't type this generically due to union type constraints
    state: TSystem
  ) => any; // Custom function
  transformType?: TransformType; // Predefined transform
}

/**
 * Helper type for creating properly typed transform instructions
 */
export type TransformInstruction<
  TSystem extends System,
  TPath extends DeepKeys<TSystem>
> = {
  path: TPath;
  operation: "transform";
  transformFn: (currentValue: PathValue<TSystem, TPath>, state: TSystem) => any;
};

/**
 * Collection of effect instructions to apply
 */
export interface EffectDefinition<TSystem extends System> {
  instructions: EffectInstruction<TSystem>[];
}

/**
 * Helper function to create a properly typed transform instruction
 */
export function createTransform<
  TSystem extends System,
  TPath extends DeepKeys<TSystem>
>(
  path: TPath,
  transformFn: (currentValue: PathValue<TSystem, TPath>, state: TSystem) => any
): TransformInstruction<TSystem, TPath> {
  return {
    path,
    operation: "transform",
    transformFn,
  };
}

/**
 * Helper function to create a typed effect instruction for any operation
 */
export function createInstruction<
  TSystem extends System,
  TPath extends DeepKeys<TSystem>
>(instruction: {
  path: TPath;
  operation: EffectOperation;
  value?: any;
  sourcePath?: DeepKeys<TSystem>;
  transformFn?: (
    currentValue: PathValue<TSystem, TPath>,
    state: TSystem
  ) => any;
  transformType?: TransformType;
}): EffectInstruction<TSystem> {
  return instruction as EffectInstruction<TSystem>;
}

/**
 * Re-export JSON types from schema for external use
 */
export type { JsonEffectInstruction, JsonEffectDefinition } from "./schema.zod";
