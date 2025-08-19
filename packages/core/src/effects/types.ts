import type { System } from "../types";
import type { DeepKeys, PathValue } from "../constraints/types";

/**
 * Effect operation types
 */
export type EffectOperation =
  | "set" // Set a value at a path
  | "unset" // Set a value to undefined/null
  | "copy" // Copy value from another path
  | "increment" // Add to a numeric value
  | "decrement" // Subtract from a numeric value
  | "append" // Add item(s) to array
  | "prepend" // Add item(s) to start of array
  | "remove" // Remove items from array
  | "clear" // Clear array (set to [])
  | "merge" // Merge object properties
  | "transform"; // Apply custom transformation function

/**
 * Individual effect instruction
 */
export interface EffectInstruction<TSystem extends System> {
  path: DeepKeys<TSystem>;
  operation: EffectOperation;
  value?: any;
  sourcePath?: DeepKeys<TSystem>;
  transformFn?: (currentValue: any, state: TSystem) => any;
  condition?: (state: TSystem) => boolean;
}

/**
 * Collection of effect instructions to apply
 */
export interface EffectDefinition<TSystem extends System> {
  instructions: EffectInstruction<TSystem>[];
}
