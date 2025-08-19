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

/**
 * Utility function to get a value from an object using dot notation
 */
function getValueByPath<T>(obj: T, path: string): any {
  return path.split(".").reduce((current: any, key: string) => {
    return current && typeof current === "object" ? current[key] : undefined;
  }, obj);
}

/**
 * Evaluates a single constraint condition
 */
function evaluateCondition<TSystem extends System>(
  state: TSystem,
  condition: ConstraintCondition<TSystem>
): { passed: boolean; error?: string } {
  const value = condition.path
    ? getValueByPath(state, condition.path)
    : undefined;
  const {
    operator,
    value: expectedValue,
    message,
    customValidator,
  } = condition;

  let passed = false;
  let defaultMessage = "";

  switch (operator) {
    case "equals":
      passed = value === expectedValue;
      defaultMessage = `Expected ${condition.path} to equal ${expectedValue}, got ${value}`;
      break;
    case "notEquals":
      passed = value !== expectedValue;
      defaultMessage = `Expected ${condition.path} to not equal ${expectedValue}`;
      break;
    case "greaterThan":
      passed = value > expectedValue;
      defaultMessage = `Expected ${condition.path} (${value}) to be greater than ${expectedValue}`;
      break;
    case "lessThan":
      passed = value < expectedValue;
      defaultMessage = `Expected ${condition.path} (${value}) to be less than ${expectedValue}`;
      break;
    case "greaterThanOrEqual":
      passed = value >= expectedValue;
      defaultMessage = `Expected ${condition.path} (${value}) to be >= ${expectedValue}`;
      break;
    case "lessThanOrEqual":
      passed = value <= expectedValue;
      defaultMessage = `Expected ${condition.path} (${value}) to be <= ${expectedValue}`;
      break;
    case "exists":
      passed = value !== undefined && value !== null;
      defaultMessage = `Expected ${condition.path} to exist`;
      break;
    case "notExists":
      passed = value === undefined || value === null;
      defaultMessage = `Expected ${condition.path} to not exist`;
      break;
    case "arrayLengthEquals":
      passed = Array.isArray(value) && value.length === expectedValue;
      defaultMessage = `Expected ${
        condition.path
      } array length to equal ${expectedValue}, got ${
        Array.isArray(value) ? value.length : "not an array"
      }`;
      break;
    case "arrayLengthGreaterThan":
      passed = Array.isArray(value) && value.length > expectedValue;
      defaultMessage = `Expected ${
        condition.path
      } array length to be > ${expectedValue}, got ${
        Array.isArray(value) ? value.length : "not an array"
      }`;
      break;
    case "arrayLengthLessThan":
      passed = Array.isArray(value) && value.length < expectedValue;
      defaultMessage = `Expected ${
        condition.path
      } array length to be < ${expectedValue}, got ${
        Array.isArray(value) ? value.length : "not an array"
      }`;
      break;
    case "isEmpty":
      if (Array.isArray(value)) {
        passed = value.length === 0;
        defaultMessage = `Expected ${condition.path} array to be empty, got length ${value.length}`;
      } else if (typeof value === "string") {
        passed = value === "";
        defaultMessage = `Expected ${condition.path} string to be empty`;
      } else {
        passed = !value;
        defaultMessage = `Expected ${condition.path} to be empty/falsy`;
      }
      break;
    case "isNotEmpty":
      if (Array.isArray(value)) {
        passed = value.length > 0;
        defaultMessage = `Expected ${condition.path} array to not be empty`;
      } else if (typeof value === "string") {
        passed = value !== "";
        defaultMessage = `Expected ${condition.path} string to not be empty`;
      } else {
        passed = !!value;
        defaultMessage = `Expected ${condition.path} to not be empty/falsy`;
      }
      break;
    case "custom":
      if (!customValidator) {
        throw new Error(
          "customValidator function is required for custom operator"
        );
      }
      passed = customValidator(state);
      defaultMessage = message || "Custom validation failed";
      break;
  }

  return {
    passed,
    error: passed ? undefined : message || defaultMessage,
  };
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
