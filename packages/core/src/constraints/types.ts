import type { System } from "../types";

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
 * Constraint operator types
 */
export type ConstraintOperator =
  | "equals"
  | "notEquals"
  | "greaterThan"
  | "lessThan"
  | "greaterThanOrEqual"
  | "lessThanOrEqual"
  | "exists"
  | "notExists"
  | "arrayLengthEquals"
  | "arrayLengthGreaterThan"
  | "arrayLengthLessThan"
  | "isEmpty"
  | "isNotEmpty"
  | "custom";

/**
 * Individual constraint condition
 */
export interface ConstraintCondition<TSystem extends System> {
  path?: DeepKeys<TSystem>; // Optional for custom validators
  operator: ConstraintOperator;
  value?: any;
  message?: string;
  customValidator?: (state: TSystem) => boolean;
}

/**
 * Logical operators for combining constraints
 */
export type LogicalOperator = "and" | "or";

/**
 * Constraint group for complex logic
 */
export interface ConstraintGroup<TSystem extends System> {
  conditions: (ConstraintCondition<TSystem> | ConstraintGroup<TSystem>)[];
  operator: LogicalOperator;
}

/**
 * Root constraint definition
 */
export type ConstraintDefinition<TSystem extends System> =
  | ConstraintCondition<TSystem>
  | ConstraintGroup<TSystem>;
