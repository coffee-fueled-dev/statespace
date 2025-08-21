import { z } from "zod";
import {
  constraint,
  createConstraintFromConfig,
  type JsonConstraintDefinition,
} from "@statespace/core";

// =============================================================================
// EXAMPLE SYSTEM STATE
// =============================================================================

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  age: z.number(),
  role: z.enum(["user", "admin", "moderator"]),
  loginCount: z.number(),
  isActive: z.boolean(),
});

const AppStateSchema = z.object({
  user: UserSchema,
  settings: z.object({
    theme: z.enum(["light", "dark"]),
    notifications: z.boolean(),
  }),
});

type AppState = z.infer<typeof AppStateSchema>;

// =============================================================================
// CONSTRAINT EXAMPLES
// =============================================================================

const sampleState: AppState = {
  user: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "John Doe",
    email: "john.doe@example.com",
    age: 25,
    role: "admin",
    loginCount: 150,
    isActive: true,
  },
  settings: {
    theme: "dark",
    notifications: true,
  },
};

// =============================================================================
// BUILDER API EXAMPLES (Type-safe, for TypeScript development)
// =============================================================================

console.log("=== BUILDER API EXAMPLES ===\n");

// Example 1: Traditional constraint builder with custom function
const adminConstraintBuilder = constraint<AppState>()
  .path("user.role")
  .equals("admin", "User must be an admin")
  .path("user.loginCount")
  .greaterThan(100, "Admin must have more than 100 logins")
  .path("user.isActive")
  .equals(true, "User must be active");

console.log(
  "Admin constraint (builder):",
  adminConstraintBuilder(sampleState, 0)
);

// Example 2: Using predefined validators in builder
const validationConstraintBuilder = constraint<AppState>()
  .path("user.id")
  .isUuid("User ID must be a valid UUID")
  .path("user.email")
  .isEmail("Email must be valid")
  .path("user.name")
  .hasMinLength(2, "Name must be at least 2 characters");

console.log(
  "Validation constraint (builder):",
  validationConstraintBuilder(sampleState, 0)
);

// =============================================================================
// JSON API EXAMPLES (Serializable, for LLM agents and external configs)
// =============================================================================

console.log("\n=== JSON API EXAMPLES ===\n");

// Example 1: Simple JSON constraint
const adminConstraintJson: JsonConstraintDefinition = {
  operator: "and",
  conditions: [
    {
      operator: "equals",
      path: "user.role",
      value: "admin",
      message: "User must be an admin",
    },
    {
      operator: "greaterThan",
      path: "user.loginCount",
      value: 100,
      message: "Admin must have more than 100 logins",
    },
    {
      operator: "equals",
      path: "user.isActive",
      value: true,
      message: "User must be active",
    },
  ],
};

const adminConstraintFromJson =
  createConstraintFromConfig<AppState>(adminConstraintJson);
console.log(
  "Admin constraint (JSON):",
  adminConstraintFromJson(sampleState, 0)
);

// Example 2: JSON constraint with predefined validators
const validationConstraintJson: JsonConstraintDefinition = {
  operator: "and",
  conditions: [
    {
      operator: "custom",
      path: "user.id",
      validatorType: "isUuid",
      message: "User ID must be a valid UUID",
    },
    {
      operator: "custom",
      path: "user.email",
      validatorType: "isEmail",
      message: "Email must be valid",
    },
    {
      operator: "custom",
      path: "user.name",
      validatorType: "hasMinLength",
      validatorValue: 2,
      message: "Name must be at least 2 characters",
    },
  ],
};

const validationConstraintFromJson = createConstraintFromConfig<AppState>(
  validationConstraintJson
);
console.log(
  "Validation constraint (JSON):",
  validationConstraintFromJson(sampleState, 0)
);

// Example 3: Complex logical constraint
const complexConstraintJson: JsonConstraintDefinition = {
  operator: "and",
  conditions: [
    {
      operator: "or",
      conditions: [
        {
          operator: "equals",
          path: "user.role",
          value: "admin",
        },
        {
          operator: "and",
          conditions: [
            {
              operator: "equals",
              path: "user.role",
              value: "moderator",
            },
            {
              operator: "greaterThan",
              path: "user.loginCount",
              value: 50,
            },
          ],
        },
      ],
    },
    {
      operator: "custom",
      path: "user.email",
      validatorType: "isEmail",
    },
    {
      operator: "custom",
      path: "user.age",
      validatorType: "isPositiveNumber",
    },
  ],
};

const complexConstraintFromJson = createConstraintFromConfig<AppState>(
  complexConstraintJson
);
console.log(
  "Complex constraint (JSON):",
  complexConstraintFromJson(sampleState, 0)
);

// =============================================================================
// DEMONSTRATION: Both APIs produce equivalent results
// =============================================================================

console.log("\n=== API EQUIVALENCE DEMO ===\n");

// Test with a state that should fail constraints
const failingState: AppState = {
  ...sampleState,
  user: {
    ...sampleState.user,
    role: "user", // Not admin
    email: "invalid-email", // Invalid email
    loginCount: 50, // Too few logins
  },
};

console.log("Testing with failing state...");
console.log("Builder result:", adminConstraintBuilder(failingState, 0));
console.log("JSON result:", adminConstraintFromJson(failingState, 0));

// =============================================================================
// LLM AGENT USAGE PATTERN
// =============================================================================

/**
 * Example function that an LLM agent might use to generate constraints
 */
function generateConstraintForRole(
  role: "admin" | "moderator" | "user"
): JsonConstraintDefinition {
  const baseConstraints = [
    {
      operator: "equals" as const,
      path: "user.isActive",
      value: true,
      message: "User must be active",
    },
    {
      operator: "custom" as const,
      path: "user.email",
      validatorType: "isEmail" as const,
      message: "Valid email required",
    },
  ];

  switch (role) {
    case "admin":
      return {
        operator: "and",
        conditions: [
          ...baseConstraints,
          {
            operator: "equals",
            path: "user.role",
            value: "admin",
          },
          {
            operator: "greaterThan",
            path: "user.loginCount",
            value: 100,
          },
        ],
      };

    case "moderator":
      return {
        operator: "and",
        conditions: [
          ...baseConstraints,
          {
            operator: "equals",
            path: "user.role",
            value: "moderator",
          },
          {
            operator: "greaterThan",
            path: "user.loginCount",
            value: 25,
          },
        ],
      };

    default:
      return {
        operator: "and",
        conditions: baseConstraints,
      };
  }
}

console.log("\n=== LLM GENERATED CONSTRAINTS ===\n");

const llmAdminConstraint = generateConstraintForRole("admin");
const llmAdminConstraintFn =
  createConstraintFromConfig<AppState>(llmAdminConstraint);
console.log(
  "LLM-generated admin constraint:",
  llmAdminConstraintFn(sampleState, 0)
);

export { generateConstraintForRole };
