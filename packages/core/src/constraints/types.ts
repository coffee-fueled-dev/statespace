import type { System } from "../types";
import type {
  JsonConstraintCondition,
  JsonConstraintGroup,
} from "./schema.zod";

/**
 * Utility type to create dot notation paths for nested objects
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
 * Utility type to get the value type at a specific path
 */
export type PathValue<T, Path extends string> = Path extends keyof T
  ? T[Path]
  : Path extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? PathValue<T[Key], Rest>
    : never
  : never;

/**
 * Constraint operator types - inferred from Zod schema
 */
export type ConstraintOperator = JsonConstraintCondition["operator"];

/**
 * Logical operators - inferred from Zod schema
 */
export type LogicalOperator = JsonConstraintGroup["operator"];

/**
 * Enhanced constraint condition with type-safe paths and optional custom validators
 * NOTE: For JSON configs, custom validators are limited to predefined functions
 */
export interface ConstraintCondition<TSystem extends System> {
  path?: DeepKeys<TSystem>; // Optional for custom validators
  operator: ConstraintOperator;
  value?: any;
  message?: string;
  customValidator?: (state: TSystem) => boolean; // Function-based validator (for programmatic use)
  validatorType?:
    | "isEmail"
    | "isUrl"
    | "isUuid"
    | "isPositiveNumber"
    | "isNegativeNumber"
    | "isInteger"
    | "isEven"
    | "isOdd"
    | "isDateString"
    | "isJsonString"
    | "isAlphanumeric"
    | "hasMinLength"
    | "hasMaxLength"
    | "matchesRegex"; // Predefined validator
  validatorValue?: any; // Additional value for parameterized validators
}

/**
 * Enhanced constraint group with type-safe paths
 */
export interface ConstraintGroup<TSystem extends System> {
  conditions: (ConstraintCondition<TSystem> | ConstraintGroup<TSystem>)[];
  operator: LogicalOperator;
}

/**
 * Root constraint definition with type-safe paths
 */
export type ConstraintDefinition<TSystem extends System> =
  | ConstraintCondition<TSystem>
  | ConstraintGroup<TSystem>;

/**
 * Re-export JSON types from schema for external use
 */
export type {
  JsonConstraintCondition,
  JsonConstraintGroup,
  JsonConstraintDefinition,
} from "./schema.zod";
