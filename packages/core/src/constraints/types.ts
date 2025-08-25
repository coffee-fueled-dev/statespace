import type { TransitionEvent } from "../transitions";
import type { Schema, Shape } from "../schema";

/**
 * Represents a constraint that a transition must satisfy. It returns a result
 * indicating if the transition is allowed and any errors if not.
 */
export type ConstraintFn<TSchema extends Schema> = (
  transitionEvent: TransitionEvent<Shape<TSchema>>
) => { allowed: boolean; errors?: string[] };
