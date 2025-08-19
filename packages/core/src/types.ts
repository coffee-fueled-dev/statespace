import { z } from "zod";

/**
 * A utility type to represent the system's state based on a Zod schema.
 */
export type System<TSchema extends z.ZodRawShape = z.ZodRawShape> = z.infer<
  z.ZodObject<TSchema>
>;

/**
 * A function that calculates the cost of a transition based on the system's
 * state.
 */
export type CostFn<TSystem> = (systemState: TSystem) => number;

/**
 * Represents a constraint that a transition must satisfy. It returns a result
 * indicating if the transition is allowed and any errors if not.
 */
export type ConstraintFn<TSystem extends System> = (
  systemState: TSystem,
  transitionCost: number
) => { allowed: boolean; errors?: string[] };

/**
 * Defines the state changes caused by a transition. It returns the complete
 * next state that will be validated and applied.
 */
export type EffectFn<TSystem extends System> = (
  systemState: TSystem
) => TSystem;
