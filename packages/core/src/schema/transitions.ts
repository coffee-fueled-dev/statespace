import { executableConstraint, type Constraint } from "./constraints";
import { executableEffect, type Effect } from "./effects";
import type { Symbol } from "./symbols";

export interface Transition<T extends object> {
  effect: Effect<T, any>;
  constraints: Constraint<T, any>[];
}

export type TransitionSuccess<T extends object> = {
  success: true;
  state: T;
};
export type TransitionFailure<T extends object> = {
  success: false;
  state: T;
  error: string;
};

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
    const { symbol } = effect;

    const isValidBefore = validateConstraints(
      "before_transition",
      constraints,
      symbol,
      state
    );

    if (!isValidBefore) {
      return {
        success: false,
        state,
        error: "Constraints failed before transition",
      };
    }

    // Execute the effect to get the new value for the symbol
    const nextValue = executableEffect(effect)(symbol, state);

    // Apply the new value to create a new state
    const nextState = applySymbolChange(state, symbol, nextValue);

    // Check after constraints
    const isValidAfter = validateConstraints(
      "after_transition",
      constraints,
      symbol,
      nextState
    );

    if (!isValidAfter) {
      return {
        success: false,
        state: nextState,
        error: "Constraints failed after transition",
      };
    }

    if (!validator(nextState)) {
      return {
        success: false,
        state,
        error: "State is not valid",
      };
    }

    return { success: true, state: nextState };
  };
}

function validateConstraints<T extends object>(
  phase: "before_transition" | "after_transition",
  constraints: Constraint<T, any>[],
  symbol: Symbol<T>,
  state: T
): boolean {
  const constrainstOfPhase = constraints.filter(
    (constraint) => constraint.phase === phase
  );
  return constrainstOfPhase.every((constraint) =>
    executableConstraint(constraint)(symbol, state)
  );
}

// Helper function to apply a symbol value change to a state object
function applySymbolChange<T extends object>(
  state: T,
  symbol: string,
  nextValue: any
): T {
  const keys = symbol.split(".");
  const newState = JSON.parse(JSON.stringify(state)); // Deep clone

  let current: any = newState;
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = nextValue;

  return newState;
}
