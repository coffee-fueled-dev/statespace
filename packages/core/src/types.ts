import { z } from "zod";

/**
 * A simple numeric type intended for unique identification. Its purpose is to act
 * as a unique identifier for elements within the system, similar to an index in
 * a list or array.
 */
export type LexicalIndex = number;

/**
 * A utility type to represent the system's state based on a Zod schema.
 */
export type System<TSchema extends z.ZodRawShape = z.ZodRawShape> = z.infer<
  z.ZodObject<TSchema>
>;

/**
 * A utility type that creates a partial version of a System type based on the Zod schema.
 */
export type PartialSystem<TSchema extends z.ZodRawShape = z.ZodRawShape> =
  Partial<z.infer<z.ZodObject<TSchema>>>;

/**
 * A function that calculates the cost of a transition based on the system's
 * state.
 */
export type Cost<TSystem> = (systemState: TSystem) => number;

/**
 * Represents a constraint that a transition must satisfy. It returns a result
 * indicating if the transition is allowed and any errors if not.
 */
export type Constraint<TSystem extends System> = (
  systemState: TSystem,
  transitionCost: number
) => { allowed: boolean; errors?: string[] };

/**
 * Defines the state changes caused by a transition. It returns the proposed
 * partial state that will be validated and applied.
 */
export type Effect<TSystem extends System> = (
  systemState: TSystem
) => Partial<TSystem>;
