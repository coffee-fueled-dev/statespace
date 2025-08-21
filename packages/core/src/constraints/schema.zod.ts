import { z } from "zod";
import { getValueByPath, createPathSchema } from "../shared/schema.zod";

/**
 * Constraint operators - comprehensive set for state validation
 */
const ConstraintOperatorSchema = z
  .enum([
    "equals",
    "notEquals",
    "greaterThan",
    "lessThan",
    "greaterThanOrEqual",
    "lessThanOrEqual",
    "exists",
    "notExists",
    "arrayLengthEquals",
    "arrayLengthGreaterThan",
    "arrayLengthLessThan",
    "isEmpty",
    "isNotEmpty",
    "custom",
  ])
  .describe("Constraint operator for state validation");

/**
 * Logical operators for combining constraints
 */
const LogicalOperatorSchema = z
  .enum(["and", "or"])
  .describe("Logical operator for combining constraints");

/**
 * Type-safe constraint schema factory
 * Creates constraint schemas with compile-time path validation for a specific state type
 */
export function createConstraintSchemas<TSystem>() {
  const PathSchema = createPathSchema<TSystem>();

  const BaseConstraintConditionSchema = z.object({
    path: PathSchema.optional().describe(
      "Path to the property to validate (optional for custom validators)"
    ),
    operator: ConstraintOperatorSchema,
    value: z
      .any()
      .optional()
      .describe("Expected value for comparison operators"),
    message: z
      .string()
      .optional()
      .describe("Custom error message if constraint fails"),
  });

  const EqualsConstraintSchema = BaseConstraintConditionSchema.extend({
    operator: z.literal("equals"),
    path: PathSchema,
    value: z.any().describe("Expected value for equality check"),
  });

  const NotEqualsConstraintSchema = BaseConstraintConditionSchema.extend({
    operator: z.literal("notEquals"),
    path: PathSchema,
    value: z.any().describe("Value that should not match"),
  });

  const GreaterThanConstraintSchema = BaseConstraintConditionSchema.extend({
    operator: z.literal("greaterThan"),
    path: PathSchema,
    value: z
      .number()
      .describe("Value that the path value must be greater than"),
  });

  const LessThanConstraintSchema = BaseConstraintConditionSchema.extend({
    operator: z.literal("lessThan"),
    path: PathSchema,
    value: z.number().describe("Value that the path value must be less than"),
  });

  const GreaterThanOrEqualConstraintSchema =
    BaseConstraintConditionSchema.extend({
      operator: z.literal("greaterThanOrEqual"),
      path: PathSchema,
      value: z
        .number()
        .describe("Value that the path value must be greater than or equal to"),
    });

  const LessThanOrEqualConstraintSchema = BaseConstraintConditionSchema.extend({
    operator: z.literal("lessThanOrEqual"),
    path: PathSchema,
    value: z
      .number()
      .describe("Value that the path value must be less than or equal to"),
  });

  const ExistsConstraintSchema = BaseConstraintConditionSchema.extend({
    operator: z.literal("exists"),
    path: PathSchema,
  }).omit({ value: true });

  const NotExistsConstraintSchema = BaseConstraintConditionSchema.extend({
    operator: z.literal("notExists"),
    path: PathSchema,
  }).omit({ value: true });

  const ArrayLengthEqualsConstraintSchema =
    BaseConstraintConditionSchema.extend({
      operator: z.literal("arrayLengthEquals"),
      path: PathSchema,
      value: z.number().min(0).describe("Expected array length"),
    });

  const ArrayLengthGreaterThanConstraintSchema =
    BaseConstraintConditionSchema.extend({
      operator: z.literal("arrayLengthGreaterThan"),
      path: PathSchema,
      value: z
        .number()
        .min(0)
        .describe("Array length must be greater than this value"),
    });

  const ArrayLengthLessThanConstraintSchema =
    BaseConstraintConditionSchema.extend({
      operator: z.literal("arrayLengthLessThan"),
      path: PathSchema,
      value: z
        .number()
        .min(0)
        .describe("Array length must be less than this value"),
    });

  const IsEmptyConstraintSchema = BaseConstraintConditionSchema.extend({
    operator: z.literal("isEmpty"),
    path: PathSchema,
  }).omit({ value: true });

  const IsNotEmptyConstraintSchema = BaseConstraintConditionSchema.extend({
    operator: z.literal("isNotEmpty"),
    path: PathSchema,
  }).omit({ value: true });

  const CustomConstraintSchema = BaseConstraintConditionSchema.extend({
    operator: z.literal("custom"),
    validatorType: z
      .enum([
        "isEmail",
        "isUrl",
        "isUuid",
        "isPositiveNumber",
        "isNegativeNumber",
        "isInteger",
        "isEven",
        "isOdd",
        "isDateString",
        "isJsonString",
        "isAlphanumeric",
        "hasMinLength",
        "hasMaxLength",
        "matchesRegex",
      ])
      .describe("Predefined validator function to apply"),
    validatorValue: z
      .any()
      .optional()
      .describe(
        "Additional value for parameterized validators (e.g., min length, regex pattern)"
      ),
  }).omit({ value: true });

  const ConstraintConditionSchema = z.discriminatedUnion("operator", [
    EqualsConstraintSchema,
    NotEqualsConstraintSchema,
    GreaterThanConstraintSchema,
    LessThanConstraintSchema,
    GreaterThanOrEqualConstraintSchema,
    LessThanOrEqualConstraintSchema,
    ExistsConstraintSchema,
    NotExistsConstraintSchema,
    ArrayLengthEqualsConstraintSchema,
    ArrayLengthGreaterThanConstraintSchema,
    ArrayLengthLessThanConstraintSchema,
    IsEmptyConstraintSchema,
    IsNotEmptyConstraintSchema,
    CustomConstraintSchema,
  ]);

  // Define the group type for this specific system
  type ConstraintGroupType = {
    operator: "and" | "or";
    conditions: (
      | z.infer<typeof ConstraintConditionSchema>
      | ConstraintGroupType
    )[];
  };

  const ConstraintGroupSchema: z.ZodType<ConstraintGroupType> = z.lazy(() =>
    z
      .object({
        operator: LogicalOperatorSchema,
        conditions: z
          .array(z.union([ConstraintConditionSchema, ConstraintGroupSchema]))
          .min(1)
          .describe("Array of conditions to combine with the logical operator"),
      })
      .describe("Group of constraints combined with logical operator")
  );

  const ConstraintDefinitionSchema = z
    .union([ConstraintConditionSchema, ConstraintGroupSchema])
    .describe(
      "Constraint definition - either a single condition or a group with logical operators"
    );

  return {
    PathSchema,
    BaseConstraintConditionSchema,
    EqualsConstraintSchema,
    NotEqualsConstraintSchema,
    GreaterThanConstraintSchema,
    LessThanConstraintSchema,
    GreaterThanOrEqualConstraintSchema,
    LessThanOrEqualConstraintSchema,
    ExistsConstraintSchema,
    NotExistsConstraintSchema,
    ArrayLengthEqualsConstraintSchema,
    ArrayLengthGreaterThanConstraintSchema,
    ArrayLengthLessThanConstraintSchema,
    IsEmptyConstraintSchema,
    IsNotEmptyConstraintSchema,
    CustomConstraintSchema,
    ConstraintConditionSchema,
    ConstraintGroupSchema,
    ConstraintDefinitionSchema,
  };
}

/**
 * Default constraint schemas (for backward compatibility)
 * Uses generic path validation - paths are typed as string but still validated at runtime
 */
const defaultSchemas = createConstraintSchemas<any>();

export const ConstraintConditionSchema =
  defaultSchemas.ConstraintConditionSchema;
export const ConstraintGroupSchema = defaultSchemas.ConstraintGroupSchema;
export const ConstraintDefinitionSchema =
  defaultSchemas.ConstraintDefinitionSchema;

/**
 * Type exports for TypeScript integration
 */
export type JsonConstraintCondition = z.infer<typeof ConstraintConditionSchema>;
export type JsonConstraintGroup = z.infer<typeof ConstraintGroupSchema>;
export type JsonConstraintDefinition = z.infer<
  typeof ConstraintDefinitionSchema
>;

// Re-export individual constraint types for better type inference
export type EqualsConstraint = z.infer<
  typeof defaultSchemas.EqualsConstraintSchema
>;
export type NotEqualsConstraint = z.infer<
  typeof defaultSchemas.NotEqualsConstraintSchema
>;
export type GreaterThanConstraint = z.infer<
  typeof defaultSchemas.GreaterThanConstraintSchema
>;
export type LessThanConstraint = z.infer<
  typeof defaultSchemas.LessThanConstraintSchema
>;
export type GreaterThanOrEqualConstraint = z.infer<
  typeof defaultSchemas.GreaterThanOrEqualConstraintSchema
>;
export type LessThanOrEqualConstraint = z.infer<
  typeof defaultSchemas.LessThanOrEqualConstraintSchema
>;
export type ExistsConstraint = z.infer<
  typeof defaultSchemas.ExistsConstraintSchema
>;
export type NotExistsConstraint = z.infer<
  typeof defaultSchemas.NotExistsConstraintSchema
>;
export type ArrayLengthEqualsConstraint = z.infer<
  typeof defaultSchemas.ArrayLengthEqualsConstraintSchema
>;
export type ArrayLengthGreaterThanConstraint = z.infer<
  typeof defaultSchemas.ArrayLengthGreaterThanConstraintSchema
>;
export type ArrayLengthLessThanConstraint = z.infer<
  typeof defaultSchemas.ArrayLengthLessThanConstraintSchema
>;
export type IsEmptyConstraint = z.infer<
  typeof defaultSchemas.IsEmptyConstraintSchema
>;
export type IsNotEmptyConstraint = z.infer<
  typeof defaultSchemas.IsNotEmptyConstraintSchema
>;
export type CustomConstraint = z.infer<
  typeof defaultSchemas.CustomConstraintSchema
>;

/**
 * Predefined custom validator functions for JSON-based constraints
 */
const CUSTOM_VALIDATORS = {
  isEmail: (value: any) =>
    typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  isUrl: (value: any) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  isUuid: (value: any) =>
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    ),
  isPositiveNumber: (value: any) => typeof value === "number" && value > 0,
  isNegativeNumber: (value: any) => typeof value === "number" && value < 0,
  isInteger: (value: any) =>
    typeof value === "number" && Number.isInteger(value),
  isEven: (value: any) => typeof value === "number" && value % 2 === 0,
  isOdd: (value: any) => typeof value === "number" && value % 2 === 1,
  isDateString: (value: any) =>
    typeof value === "string" && !isNaN(Date.parse(value)),
  isJsonString: (value: any) => {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  },
  isAlphanumeric: (value: any) =>
    typeof value === "string" && /^[a-zA-Z0-9]+$/.test(value),
  hasMinLength: (value: any, minLength: number) =>
    typeof value === "string" && value.length >= minLength,
  hasMaxLength: (value: any, maxLength: number) =>
    typeof value === "string" && value.length <= maxLength,
  matchesRegex: (value: any, pattern: string) =>
    typeof value === "string" && new RegExp(pattern).test(value),
} as const;

/**
 * Evaluate a JSON constraint condition
 */
function evaluateJsonConstraintCondition<TSystem>(
  condition: JsonConstraintCondition,
  state: TSystem
): { passed: boolean; error?: string } {
  const { operator, path, message } = condition;
  const value = "value" in condition ? condition.value : undefined;

  // Get the actual value from state (if path is provided)
  const actualValue = path ? getValueByPath(state, path) : undefined;

  let passed = false;
  let defaultMessage = "";

  switch (operator) {
    case "equals":
      passed = actualValue === value;
      defaultMessage = `Expected ${path} to equal ${value}, got ${actualValue}`;
      break;

    case "notEquals":
      passed = actualValue !== value;
      defaultMessage = `Expected ${path} to not equal ${value}`;
      break;

    case "greaterThan":
      passed = actualValue > value;
      defaultMessage = `Expected ${path} (${actualValue}) to be greater than ${value}`;
      break;

    case "lessThan":
      passed = actualValue < value;
      defaultMessage = `Expected ${path} (${actualValue}) to be less than ${value}`;
      break;

    case "greaterThanOrEqual":
      passed = actualValue >= value;
      defaultMessage = `Expected ${path} (${actualValue}) to be >= ${value}`;
      break;

    case "lessThanOrEqual":
      passed = actualValue <= value;
      defaultMessage = `Expected ${path} (${actualValue}) to be <= ${value}`;
      break;

    case "exists":
      passed = actualValue !== undefined && actualValue !== null;
      defaultMessage = `Expected ${path} to exist`;
      break;

    case "notExists":
      passed = actualValue === undefined || actualValue === null;
      defaultMessage = `Expected ${path} to not exist`;
      break;

    case "arrayLengthEquals":
      passed = Array.isArray(actualValue) && actualValue.length === value;
      defaultMessage = `Expected ${path} array length to equal ${value}, got ${
        Array.isArray(actualValue) ? actualValue.length : "not an array"
      }`;
      break;

    case "arrayLengthGreaterThan":
      passed = Array.isArray(actualValue) && actualValue.length > value;
      defaultMessage = `Expected ${path} array length to be > ${value}, got ${
        Array.isArray(actualValue) ? actualValue.length : "not an array"
      }`;
      break;

    case "arrayLengthLessThan":
      passed = Array.isArray(actualValue) && actualValue.length < value;
      defaultMessage = `Expected ${path} array length to be < ${value}, got ${
        Array.isArray(actualValue) ? actualValue.length : "not an array"
      }`;
      break;

    case "isEmpty":
      if (Array.isArray(actualValue)) {
        passed = actualValue.length === 0;
        defaultMessage = `Expected ${path} array to be empty, got length ${actualValue.length}`;
      } else if (typeof actualValue === "string") {
        passed = actualValue === "";
        defaultMessage = `Expected ${path} string to be empty`;
      } else {
        passed = !actualValue;
        defaultMessage = `Expected ${path} to be empty/falsy`;
      }
      break;

    case "isNotEmpty":
      if (Array.isArray(actualValue)) {
        passed = actualValue.length > 0;
        defaultMessage = `Expected ${path} array to not be empty`;
      } else if (typeof actualValue === "string") {
        passed = actualValue !== "";
        defaultMessage = `Expected ${path} string to not be empty`;
      } else {
        passed = !!actualValue;
        defaultMessage = `Expected ${path} to not be empty/falsy`;
      }
      break;

    case "custom":
      const customCondition = condition as CustomConstraint;
      const validator = CUSTOM_VALIDATORS[customCondition.validatorType];
      if (!validator) {
        throw new Error(
          `Unknown custom validator: ${customCondition.validatorType}`
        );
      }

      // Handle parameterized validators
      if (
        ["hasMinLength", "hasMaxLength", "matchesRegex"].includes(
          customCondition.validatorType
        )
      ) {
        passed = (validator as any)(
          actualValue,
          customCondition.validatorValue
        );
      } else {
        passed = (validator as any)(actualValue);
      }
      defaultMessage =
        message || `Custom validation failed: ${customCondition.validatorType}`;
      break;

    default:
      throw new Error(`Unknown constraint operator: ${operator}`);
  }

  return {
    passed,
    error: passed ? undefined : message || defaultMessage,
  };
}

/**
 * Evaluate a JSON constraint definition (condition or group)
 */
function evaluateJsonConstraintDefinition<TSystem>(
  definition: JsonConstraintDefinition,
  state: TSystem
): { passed: boolean; errors: string[] } {
  // If it's a simple condition (has operator and doesn't have conditions array)
  if ("operator" in definition && !("conditions" in definition)) {
    const result = evaluateJsonConstraintCondition(
      definition as JsonConstraintCondition,
      state
    );
    return {
      passed: result.passed,
      errors: result.error ? [result.error] : [],
    };
  }

  // If it's a group
  const group = definition as JsonConstraintGroup;
  const results = group.conditions.map((condition: JsonConstraintDefinition) =>
    evaluateJsonConstraintDefinition(condition, state)
  );

  if (group.operator === "and") {
    const passed = results.every((r: { passed: boolean }) => r.passed);
    const errors = results.flatMap((r: { errors: string[] }) => r.errors);
    return { passed, errors };
  } else {
    // "or"
    const passed = results.some((r: { passed: boolean }) => r.passed);
    // For OR, only show errors if all conditions failed
    const errors = passed
      ? []
      : results.flatMap((r: { errors: string[] }) => r.errors);
    return { passed, errors };
  }
}

/**
 * Create a constraint function from a validated JSON configuration
 */
export function createConstraintFromConfig<TSystem>(
  config: JsonConstraintDefinition
): (
  state: TSystem,
  transitionCost?: number
) => { allowed: boolean; errors?: string[] } {
  // Validate the config
  const validatedConfig = ConstraintDefinitionSchema.parse(config);

  return (state: TSystem, transitionCost: number = 0) => {
    const result = evaluateJsonConstraintDefinition(validatedConfig, state);
    return {
      allowed: result.passed,
      errors: result.errors.length > 0 ? result.errors : undefined,
    };
  };
}

/**
 * LLM AGENT DOCUMENTATION
 * ======================
 *
 * This schema defines a JSON-configurable constraint system for state validation.
 * LLM agents can generate constraint configurations using structured tool calls.
 *
 * ## Basic Structure
 *
 * Constraints can be defined as either:
 * 1. Single condition: { "operator": "equals", "path": "user.role", "value": "admin" }
 * 2. Logical groups: { "operator": "and", "conditions": [...] }
 *
 * ## Available Operators
 *
 * ### Comparison Operators
 * - equals: Exact value match
 * - notEquals: Value mismatch
 * - greaterThan/lessThan: Numeric comparisons
 * - greaterThanOrEqual/lessThanOrEqual: Inclusive numeric comparisons
 *
 * ### Existence Operators
 * - exists: Property exists and is not null/undefined
 * - notExists: Property is null/undefined
 *
 * ### Array Operators
 * - arrayLengthEquals: Exact array length
 * - arrayLengthGreaterThan/arrayLengthLessThan: Array length comparisons
 * - isEmpty/isNotEmpty: Empty/non-empty checks for arrays, strings, or falsy values
 *
 * ### Custom Validators
 * - custom: Predefined validation functions (isEmail, isUrl, isUuid, etc.)
 *
 * ## Path Notation
 *
 * Use dot notation for nested paths:
 * - "user.name" → obj.user.name
 * - "items.0.status" → obj.items[0].status
 * - "config.settings.theme" → obj.config.settings.theme
 *
 * ## Type-Safe Usage
 *
 * For compile-time path validation, use the typed schema factory:
 *
 * ```typescript
 * import { createConstraintSchemas } from './schema.zod';
 *
 * type MyState = {
 *   user: { name: string; age: number };
 *   settings: { theme: string };
 * };
 *
 * const schemas = createConstraintSchemas<MyState>();
 *
 * // This will provide autocomplete and validation for paths:
 * const constraint = schemas.ConstraintDefinitionSchema.parse({
 *   operator: "equals",
 *   path: "user.name", // ✅ Valid path
 *   // path: "user.invalid", // ❌ TypeScript error
 *   value: "John"
 * });
 * ```
 *
 * ## Examples for LLM Agents
 *
 * ### Simple equality check:
 * {
 *   "operator": "equals",
 *   "path": "user.role",
 *   "value": "admin"
 * }
 *
 * ### Numeric comparison:
 * {
 *   "operator": "greaterThanOrEqual",
 *   "path": "user.loginCount",
 *   "value": 100
 * }
 *
 * ### Array length validation:
 * {
 *   "operator": "arrayLengthGreaterThan",
 *   "path": "user.notifications",
 *   "value": 0
 * }
 *
 * ### Custom validation:
 * {
 *   "operator": "custom",
 *   "path": "user.email",
 *   "validatorType": "isEmail"
 * }
 *
 * ### Complex logical conditions:
 * {
 *   "operator": "and",
 *   "conditions": [
 *     {
 *       "operator": "equals",
 *       "path": "user.role",
 *       "value": "admin"
 *     },
 *     {
 *       "operator": "greaterThan",
 *       "path": "user.loginCount",
 *       "value": 10
 *     }
 *   ]
 * }
 *
 * ### OR logic:
 * {
 *   "operator": "or",
 *   "conditions": [
 *     {
 *       "operator": "equals",
 *       "path": "user.role",
 *       "value": "admin"
 *     },
 *     {
 *       "operator": "equals",
 *       "path": "user.role",
 *       "value": "moderator"
 *     }
 *   ]
 * }
 *
 * ## Validation
 *
 * All configurations are validated against the Zod schema before execution.
 * Invalid configurations will throw validation errors with detailed messages.
 *
 * ## Usage in Code
 *
 * ```typescript
 * import { createConstraintFromConfig, ConstraintDefinitionSchema } from './schema.zod';
 *
 * // Validate configuration
 * const config = ConstraintDefinitionSchema.parse(userProvidedConfig);
 *
 * // Create constraint function
 * const constraint = createConstraintFromConfig(config);
 *
 * // Apply to state
 * const result = constraint(currentState);
 * if (!result.allowed) {
 *   console.log("Constraint failed:", result.errors);
 * }
 * ```
 */
