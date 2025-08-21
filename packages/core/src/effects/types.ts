import type { System } from "../types";
import type { DeepKeys } from "../constraints/types";
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
  transformFn?: (currentValue: any, state: TSystem) => any; // Custom function
  transformType?: TransformType; // Predefined transform
  condition?: (state: TSystem) => boolean; // Function-based condition only (for programmatic use)
}

/**
 * Collection of effect instructions to apply
 */
export interface EffectDefinition<TSystem extends System> {
  instructions: EffectInstruction<TSystem>[];
}

/**
 * Re-export JSON types from schema for external use
 */
export type { JsonEffectInstruction, JsonEffectDefinition } from "./schema.zod";
