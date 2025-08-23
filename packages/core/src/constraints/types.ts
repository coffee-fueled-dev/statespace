import type { PendingTransitionEvent } from "../transitions";
import type { System } from "../shared/types";

/**
 * Represents a constraint that a transition must satisfy. It returns a result
 * indicating if the transition is allowed and any errors if not.
 */
export type ConstraintFn<TSchema extends System> = (
  transitionEvent: PendingTransitionEvent<TSchema>
) => { allowed: boolean; errors?: string[] };
