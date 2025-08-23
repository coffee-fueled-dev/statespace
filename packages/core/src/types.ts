import { z } from "zod/v4";

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
export type CostFn<TSystem extends System> = (systemState: TSystem) => number;

/**
 * Defines the state changes caused by a transition. It returns the complete
 * next state that will be validated and applied.
 */
export type EffectFn<TSystem extends System> = (
  systemState: TSystem
) => TSystem;
