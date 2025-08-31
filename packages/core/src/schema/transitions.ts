import { executableConstraint, type Constraint } from "./constraints";
import { executableEffect, type Effect, type Metadata } from "./effects";
import type { Path } from "./paths";

export interface Transition<T extends object> {
  effect: Effect<T, any>;
  constraints: Constraint<T, any>[];
}

export type TransitionSuccess<T extends object> = {
  success: true;
  state: T;
  effect: Effect<T, any>;
};
export type TransitionFailure<T extends object> = {
  success: false;
  state: T;
  error: string;
  effect: Effect<T, any>;
};

export type TransitionResult<T extends object> =
  | TransitionSuccess<T>
  | TransitionFailure<T>;

export function transition<T extends object>(
  transition: Transition<T>
): Transition<T> {
  return transition;
}

export type TransitionFn<T extends object> = (
  state: T
) => Promise<TransitionSuccess<T> | TransitionFailure<T>>;

export function executableTransition<T extends object>(
  transition: Transition<T>,
  validator: (state: T) => boolean
): TransitionFn<T> {
  return async (state) => {
    const { effect, constraints } = transition;
    const { path } = effect;

    const isValidBefore = validateConstraints(
      "before_transition",
      constraints,
      path,
      state
    );

    if (!isValidBefore) {
      return {
        success: false,
        state,
        error: "Constraints failed before transition",
        effect: effect,
      };
    }

    // Execute the effect to get the new value for the path
    const nextValue = executableEffect(effect)(path, state);

    let nextState = state;
    // Apply the new value to create a new state
    try {
      nextState = applyEffect(state, path, nextValue);
    } catch (error) {
      let errorMessage = "Failed to apply effect";
      if (error instanceof Error) {
        errorMessage += ":\n" + error.message;
      }
      return {
        success: false,
        state: nextState,
        error: errorMessage,
        effect: effect,
      };
    }

    // Check after constraints
    const isValidAfter = validateConstraints(
      "after_transition",
      constraints,
      path,
      nextState
    );

    if (!isValidAfter) {
      return {
        success: false,
        state: nextState,
        error: "Constraints failed after transition",
        effect: effect,
      };
    }

    if (!validator(nextState)) {
      return {
        success: false,
        state,
        error: "State is not valid",
        effect: effect,
      };
    }

    return {
      success: true,
      state: nextState,
      effect: effect,
    };
  };
}

function validateConstraints<T extends object>(
  phase: "before_transition" | "after_transition",
  constraints: Constraint<T, any>[],
  path: Path<T>,
  state: T
): boolean {
  const constrainstOfPhase = constraints.filter(
    (constraint) => constraint.phase === phase
  );
  try {
    return constrainstOfPhase.every((constraint) =>
      executableConstraint(constraint)(path, state, phase)
    );
  } catch (error) {
    return false;
  }
}

// Helper function to apply an effect to a state object
function applyEffect<T extends object>(
  state: T,
  path: Path<T>,
  nextValue: any
): T {
  const keys = path.split(".");
  const newState = JSON.parse(JSON.stringify(state)); // Deep clone

  let current: any = newState;
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = nextValue;

  return newState;
}
