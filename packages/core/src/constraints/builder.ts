import type { System, ConstraintFn } from "../types";
import type {
  ConstraintCondition,
  ConstraintDefinition,
  ConstraintGroup,
  ConstraintOperator,
  DeepKeys,
  LogicalOperator,
  PathValue,
} from "./types";
import { createConstraintFromConfig } from "./schema.zod";

/**
 * Convert builder constraint condition to JSON format and use schema-based evaluation
 */
function evaluateCondition<TSystem extends System>(
  state: TSystem,
  condition: ConstraintCondition<TSystem>
): { passed: boolean; error?: string } {
  // Handle custom function-based validators (not available in JSON schema)
  if (condition.operator === "custom" && condition.customValidator) {
    const passed = condition.customValidator(state);
    return {
      passed,
      error: passed
        ? undefined
        : condition.message || "Custom validation failed",
    };
  }

  // Convert to JSON format for schema-based processing
  const jsonCondition: any = {
    operator: condition.operator,
    path: condition.path as string,
    value: condition.value,
    message: condition.message,
  };

  // Handle predefined custom validators
  if (condition.operator === "custom" && condition.validatorType) {
    jsonCondition.validatorType = condition.validatorType;
    jsonCondition.validatorValue = condition.validatorValue;
  }

  // Use the schema's evaluation logic
  try {
    const constraintFn = createConstraintFromConfig<TSystem>(jsonCondition);
    const result = constraintFn(state);
    return {
      passed: result.allowed,
      error: result.errors?.[0],
    };
  } catch (error) {
    return {
      passed: false,
      error: `Constraint evaluation failed: ${error}`,
    };
  }
}

/**
 * Evaluates a constraint definition (condition or group)
 */
function evaluateConstraint<TSystem extends System>(
  state: TSystem,
  definition: ConstraintDefinition<TSystem>
): { passed: boolean; errors: string[] } {
  // If it's a simple condition (has operator, and either path or customValidator)
  if (
    "operator" in definition &&
    ("path" in definition || "customValidator" in definition)
  ) {
    const result = evaluateCondition(state, definition);
    return {
      passed: result.passed,
      errors: result.error ? [result.error] : [],
    };
  }

  // If it's a group
  const group = definition as ConstraintGroup<TSystem>;
  const results = group.conditions.map((condition) =>
    evaluateConstraint(state, condition)
  );

  if (group.operator === "and") {
    const passed = results.every((r) => r.passed);
    const errors = results.flatMap((r) => r.errors);
    return { passed, errors };
  } else {
    // "or"
    const passed = results.some((r) => r.passed);
    // For OR, only show errors if all conditions failed
    const errors = passed ? [] : results.flatMap((r) => r.errors);
    return { passed, errors };
  }
}

/**
 * Internal constraint builder implementation
 */
class ConstraintBuilderImpl<TSystem extends System> {
  private conditions: ConstraintDefinition<TSystem>[] = [];
  private currentOperator: LogicalOperator = "and";
  private _builtConstraint?: ConstraintFn<TSystem>;

  /**
   * Start a new condition for a specific path
   */
  path<Path extends DeepKeys<TSystem>>(
    path: Path
  ): PathConstraintBuilder<TSystem, PathValue<TSystem, Path>> {
    return new PathConstraintBuilder<TSystem, PathValue<TSystem, Path>>(
      this as any,
      path as string
    );
  }

  /**
   * Set the logical operator for combining conditions
   */
  operator(op: LogicalOperator): this {
    this.currentOperator = op;
    this._builtConstraint = undefined; // Invalidate cache
    return this;
  }

  /**
   * Add a condition to the builder
   */
  addCondition(condition: ConstraintCondition<TSystem>): this {
    this.conditions.push(condition);
    this._builtConstraint = undefined; // Invalidate cache
    return this;
  }

  /**
   * Add a group to the builder
   */
  addGroup(group: ConstraintGroup<TSystem>): this {
    this.conditions.push(group);
    this._builtConstraint = undefined; // Invalidate cache
    return this;
  }

  /**
   * Add a custom validation function
   */
  custom(validator: (state: TSystem) => boolean, message?: string): this {
    this.addCondition({
      operator: "custom",
      customValidator: validator,
      message,
    } as ConstraintCondition<TSystem>);
    return this;
  }

  /**
   * Add a predefined custom validator (JSON-compatible)
   */
  customValidator(
    validatorType:
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
      | "matchesRegex",
    validatorValue?: any,
    message?: string
  ): this {
    this.addCondition({
      operator: "custom",
      validatorType,
      validatorValue,
      message,
    } as unknown as ConstraintCondition<TSystem>);
    return this;
  }

  /**
   * Create a nested group with OR logic
   */
  or(builderFn: (builder: ConstraintBuilderImpl<TSystem>) => void): this {
    const nestedBuilder = new ConstraintBuilderImpl<TSystem>();
    nestedBuilder.operator("or");
    builderFn(nestedBuilder);

    if (nestedBuilder.conditions.length > 0) {
      this.addGroup({
        conditions: nestedBuilder.conditions,
        operator: "or",
      });
    }

    return this;
  }

  /**
   * Create a nested group with AND logic
   */
  and(builderFn: (builder: ConstraintBuilderImpl<TSystem>) => void): this {
    const nestedBuilder = new ConstraintBuilderImpl<TSystem>();
    nestedBuilder.operator("and");
    builderFn(nestedBuilder);

    if (nestedBuilder.conditions.length > 0) {
      this.addGroup({
        conditions: nestedBuilder.conditions,
        operator: "and",
      });
    }

    return this;
  }

  /**
   * Get the constraint function, building and caching it if needed
   */
  getConstraintFunction(): ConstraintFn<TSystem> {
    if (!this._builtConstraint) {
      this._builtConstraint = this.build();
    }
    return this._builtConstraint;
  }

  /**
   * Build the final constraint function
   */
  build(): ConstraintFn<TSystem> {
    if (this.conditions.length === 0) {
      return () => ({ allowed: true });
    }

    const rootGroup: ConstraintGroup<TSystem> = {
      conditions: this.conditions,
      operator: this.currentOperator,
    };

    return (state: TSystem) => {
      const result = evaluateConstraint(state, rootGroup);
      return {
        allowed: result.passed,
        errors: result.errors.length > 0 ? result.errors : undefined,
      };
    };
  }
}

/**
 * Combined type: constraint function + builder methods
 */
export type ConstraintBuilder<TSystem extends System> = ConstraintFn<TSystem> &
  ConstraintBuilderImpl<TSystem>;

/**
 * Path-specific constraint builder for type-safe operations
 */
export class PathConstraintBuilder<TSystem extends System, TValue> {
  constructor(
    private parent: ConstraintBuilder<TSystem>,
    private path: string
  ) {}

  private addCondition(
    operator: ConstraintOperator,
    value?: any,
    message?: string
  ): ConstraintBuilder<TSystem> {
    this.parent.addCondition({
      path: this.path as DeepKeys<TSystem>,
      operator,
      value,
      message,
    });
    return this.parent;
  }

  equals(value: TValue, message?: string): ConstraintBuilder<TSystem> {
    return this.addCondition("equals", value, message);
  }

  notEquals(value: TValue, message?: string): ConstraintBuilder<TSystem> {
    return this.addCondition("notEquals", value, message);
  }

  greaterThan(value: TValue, message?: string): ConstraintBuilder<TSystem> {
    return this.addCondition("greaterThan", value, message);
  }

  lessThan(value: TValue, message?: string): ConstraintBuilder<TSystem> {
    return this.addCondition("lessThan", value, message);
  }

  greaterThanOrEqual(
    value: TValue,
    message?: string
  ): ConstraintBuilder<TSystem> {
    return this.addCondition("greaterThanOrEqual", value, message);
  }

  lessThanOrEqual(value: TValue, message?: string): ConstraintBuilder<TSystem> {
    return this.addCondition("lessThanOrEqual", value, message);
  }

  exists(message?: string): ConstraintBuilder<TSystem> {
    return this.addCondition("exists", undefined, message);
  }

  notExists(message?: string): ConstraintBuilder<TSystem> {
    return this.addCondition("notExists", undefined, message);
  }

  // Array-specific methods
  arrayLengthEquals(
    length: number,
    message?: string
  ): ConstraintBuilder<TSystem> {
    return this.addCondition("arrayLengthEquals", length, message);
  }

  arrayLengthGreaterThan(
    length: number,
    message?: string
  ): ConstraintBuilder<TSystem> {
    return this.addCondition("arrayLengthGreaterThan", length, message);
  }

  arrayLengthLessThan(
    length: number,
    message?: string
  ): ConstraintBuilder<TSystem> {
    return this.addCondition("arrayLengthLessThan", length, message);
  }

  isEmpty(message?: string): ConstraintBuilder<TSystem> {
    return this.addCondition("isEmpty", undefined, message);
  }

  isNotEmpty(message?: string): ConstraintBuilder<TSystem> {
    return this.addCondition("isNotEmpty", undefined, message);
  }

  // Predefined custom validator methods
  isEmail(message?: string): ConstraintBuilder<TSystem> {
    this.parent.addCondition({
      path: this.path as DeepKeys<TSystem>,
      operator: "custom",
      validatorType: "isEmail",
      message,
    } as unknown as ConstraintCondition<TSystem>);
    return this.parent;
  }

  isUrl(message?: string): ConstraintBuilder<TSystem> {
    this.parent.addCondition({
      path: this.path as DeepKeys<TSystem>,
      operator: "custom",
      validatorType: "isUrl",
      message,
    } as unknown as ConstraintCondition<TSystem>);
    return this.parent;
  }

  isUuid(message?: string): ConstraintBuilder<TSystem> {
    this.parent.addCondition({
      path: this.path as DeepKeys<TSystem>,
      operator: "custom",
      validatorType: "isUuid",
      message,
    } as unknown as ConstraintCondition<TSystem>);
    return this.parent;
  }

  isPositiveNumber(message?: string): ConstraintBuilder<TSystem> {
    this.parent.addCondition({
      path: this.path as DeepKeys<TSystem>,
      operator: "custom",
      validatorType: "isPositiveNumber",
      message,
    } as unknown as ConstraintCondition<TSystem>);
    return this.parent;
  }

  matchesRegex(pattern: string, message?: string): ConstraintBuilder<TSystem> {
    this.parent.addCondition({
      path: this.path as DeepKeys<TSystem>,
      operator: "custom",
      validatorType: "matchesRegex",
      validatorValue: pattern,
      message,
    } as unknown as ConstraintCondition<TSystem>);
    return this.parent;
  }

  hasMinLength(
    minLength: number,
    message?: string
  ): ConstraintBuilder<TSystem> {
    this.parent.addCondition({
      path: this.path as DeepKeys<TSystem>,
      operator: "custom",
      validatorType: "hasMinLength",
      validatorValue: minLength,
      message,
    } as unknown as ConstraintCondition<TSystem>);
    return this.parent;
  }
}

/**
 * Factory function to create a new constraint builder that's also callable as a constraint function
 */
export function constraint<
  TSystem extends System
>(): ConstraintBuilder<TSystem> {
  const impl = new ConstraintBuilderImpl<TSystem>();

  // Create a function that can be called as a constraint
  const constraintFn = (state: TSystem, transitionCost: number = 0) => {
    return impl.getConstraintFunction()(state, transitionCost);
  };

  // Copy all methods from the implementation to the function
  Object.setPrototypeOf(constraintFn, ConstraintBuilderImpl.prototype);
  Object.assign(constraintFn, impl);

  return constraintFn as ConstraintBuilder<TSystem>;
}
