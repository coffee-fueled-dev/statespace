import type { TransitionResult } from "./types";
import type { ValidateFunction } from "ajv";
import type { Shape } from "../schema/types";
import type { Schema } from "../schema";
import type { ExecutableTransition } from "./compile";

/**
 * Applies a single transition rule to a system state.
 * @returns The result of applying the transition (success or failure)
 */
export function applyTransition<TSchema extends Schema>(
  validator: ValidateFunction<Shape<TSchema>>,
  currentState: { shape: Shape<TSchema> },
  ruleName: string,
  rule: ExecutableTransition<TSchema>
): TransitionResult<Shape<TSchema>> {
  // Calculate the transition cost
  const transitionCost =
    typeof rule.cost === "function"
      ? rule.cost(currentState.shape)
      : rule.cost || 0;

  // Apply the effect to generate the next state
  const nextState = rule.effect(currentState.shape);

  // Check the constraint for the rule
  const constraintResult = rule.constraint({
    nextState: { shape: nextState },
    currentState,
    ruleName,
    cost: transitionCost,
    metadata: rule.metadata,
  });
  if (!constraintResult.allowed) {
    return {
      ruleName,
      systemState: { shape: currentState.shape },
      cost: transitionCost,
      metadata: rule.metadata,
      success: false,
      reason: "constraint",
      errors: constraintResult.errors || ["Constraint not satisfied"],
    };
  }

  const isValid = validator(nextState);
  if (!isValid) {
    return {
      ruleName,
      systemState: { shape: currentState.shape },
      cost: transitionCost,
      metadata: rule.metadata,
      success: false,
      reason: "shape",
      errors: ["Invalid shape"],
    };
  }

  return {
    ruleName,
    systemState: { shape: nextState },
    cost: transitionCost,
    success: true,
    metadata: rule.metadata,
  };
}
