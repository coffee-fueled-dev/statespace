import type { Constraint } from "../constraint/domain";
import type { Effect } from "../effect/domain";
import type { Path } from "../path/domain";

export interface Transition<TState extends object> {
  name: string;
  effect: Effect<TState>;
  constraints: Constraint<TState, Path<TState>>[]; // Constraints could point to any path of state, not exclusively TPath
}

export type TransitionFn<TState extends object> = (
  state: TState
) => TransitionResult<TState>;

export type TransitionSuccess<TState extends object> = {
  success: true;
  name: string;
  state: TState;
  effect: Effect<TState>;
};
export type TransitionFailure<TState extends object> = {
  success: false;
  name: string;
  state: TState;
  error: string;
  effect: Effect<TState>;
};

export type TransitionResult<TState extends object> =
  | TransitionSuccess<TState>
  | TransitionFailure<TState>;

export interface ITransitionRepository {
  readonly apply: <TState extends object>(
    state: TState,
    transition: Transition<TState>,
    validator: (state: TState) => boolean
  ) => TransitionResult<TState>;

  readonly makeExecutable: <TState extends object>(
    transition: Transition<TState>,
    validator: (state: TState) => boolean
  ) => TransitionFn<TState>;

  readonly validateConstraints: <
    TState extends object,
    TPath extends Path<TState> = Path<TState>
  >(
    phase: "before_transition" | "after_transition",
    constraints: Constraint<TState, TPath>[],
    state: TState
  ) => boolean;
}
