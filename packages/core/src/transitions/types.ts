import type { ConstraintFn, CostFn, EffectFn, System } from "../types";

/**
 * The core data structure that describes an atomic, valid action in the system.
 */
export interface TransitionRule<TSystem extends System> {
  /**
   * The constraint for this rule to be valid. The search algorithm checks
   * if the current system state satisfies this constraint.
   */
  constraint: ConstraintFn<TSystem>;
  /**
   * The effect of the rule. This is the state change that will be proposed
   * to create the next state. It must pass runtime validation.
   */
  effect: TSystem | EffectFn<TSystem>;
  /** A function to calculate the cost of applying this rule. Defaults to 0. */
  cost?: number | CostFn<TSystem> | null | undefined;
  /** Metadata for the transition */
  metadata?: Record<string, unknown> | null | undefined;
}

/**
 * A type for a collection of transition rules with proper type inference.
 */
export type TransitionRules<TSystem extends System> = Record<
  string,
  TransitionRule<TSystem>
>;

/**
 * Represents the result of applying a transition rule.
 */
export interface TransitionSuccess<TSystem extends System> {
  /** The name of the transition rule that was applied */
  ruleName: string;
  /** The resulting state after applying the transition */
  systemState: TSystem;
  /** The cost of applying this transition */
  cost: number;
  /** Whether the transition was successful */
  success: true;
}

/**
 * Represents a failed transition attempt.
 */
export interface TransitionFailure {
  /** The name of the transition rule that failed */
  ruleName: string;
  /** Whether the transition was successful */
  success: false;
  /** The reason for the failure */
  reason: "constraint" | "validation";
  /** Error details */
  errors: string[];
}

/**
 * Union type for transition outcomes.
 */
export type TransitionResult<TSystem extends System> =
  | TransitionSuccess<TSystem>
  | TransitionFailure;
