import z from "zod";
import type { System } from "../types";
import type { TransitionResult, TransitionRules } from "./types";

/**
 * Applies a single transition rule to a system state.
 * @param systemSchema The Zod schema for validation
 * @param currentState The current system state
 * @param ruleName The name of the rule being applied
 * @param rule The transition rule to apply
 * @returns The result of applying the transition (success or failure)
 */
export function applyTransition<TSchema extends z.ZodRawShape>(
  systemSchema: z.ZodObject<TSchema>,
  currentState: System<TSchema>,
  ruleName: string,
  rule: TransitionRules<System<TSchema>>[string]
): TransitionResult<System<TSchema>> {
  // Calculate the transition cost
  const transitionCost =
    typeof rule.cost === "function" ? rule.cost(currentState) : rule.cost || 0;

  // Check the constraint for the rule
  const constraintResult = rule.constraint(currentState, transitionCost);
  if (!constraintResult.allowed) {
    return {
      ruleName,
      success: false,
      reason: "constraint",
      errors: constraintResult.errors || ["Constraint not satisfied"],
    };
  }

  // Apply the effect to generate the next state
  const nextState =
    typeof rule.effect === "function" ? rule.effect(currentState) : rule.effect;

  // Runtime validation of the new state
  const validationResult = systemSchema.safeParse(nextState);
  if (!validationResult.success) {
    return {
      ruleName,
      success: false,
      reason: "validation",
      errors: z
        .treeifyError(validationResult.error)
        .errors.map((err: any) => `${err.path.join(".")}: ${err.message}`),
    };
  }

  return {
    ruleName,
    systemState: validationResult.data,
    cost: transitionCost,
    success: true,
  };
}
