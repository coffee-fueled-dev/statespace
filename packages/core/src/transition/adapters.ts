import { ConstraintRepository } from "../constraint/adapters";
import { EffectRepository } from "../effect/adapters";
import type {
  ITransitionRepository,
  TransitionFailure,
  TransitionSuccess,
} from "./domain";

export const TransitionRepository: ITransitionRepository = {
  apply: (state, transition, validator) =>
    TransitionRepository.makeExecutable(transition, validator)(state),

  validateConstraints: (phase, constraints, state) => {
    const constrainstOfPhase = constraints.filter(
      (constraint) => constraint.phase === phase,
    );
    try {
      return constrainstOfPhase.every((constraint) => {
        const result = ConstraintRepository.apply(
          constraint,
          state,
          constraint.path,
          phase,
        );
        return result.success;
      });
    } catch (error) {
      return false;
    }
  },

  makeExecutable: (transition, validator) => (state) => {
    const { effect, constraints } = transition;
    const { path } = effect;

    type TState = typeof state;

    const isValidBefore = TransitionRepository.validateConstraints(
      "before_transition",
      constraints,
      state,
    );

    if (!isValidBefore) {
      return {
        success: false,
        name: transition.name,
        state,
        error: "Constraints failed before transition",
        effect: effect,
      } satisfies TransitionFailure<TState>;
    }

    const result = EffectRepository.apply(state, path, transition, validator);

    if (!result.success) {
      return {
        success: false,
        name: transition.name,
        state,
        error: result.error,
        effect: effect,
      } satisfies TransitionFailure<TState>;
    }

    // Check after constraints
    const isValidAfter = TransitionRepository.validateConstraints(
      "after_transition",
      constraints,
      result.state,
    );

    if (!isValidAfter) {
      return {
        success: false,
        name: transition.name,
        state: result.state,
        error: "Constraints failed after transition",
        effect: effect,
      } satisfies TransitionFailure<TState>;
    }

    return {
      success: true,
      name: transition.name,
      state: result.state,
      effect: effect,
    } satisfies TransitionSuccess<TState>;
  },
} as const;
