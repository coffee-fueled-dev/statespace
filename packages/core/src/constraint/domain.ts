import type { Path, Value } from "../path/domain";
import type { Schema } from "../statespace/domain";

export type ConstraintSuccess<
  TState extends object,
  TPath extends Path<TState> = Path<TState>,
> = {
  success: true;
  state: TState;
  phase: "before_transition" | "after_transition";
  path: TPath;
};

export type ConstraintFailure<
  TState extends object,
  TPath extends Path<TState> = Path<TState>,
> = {
  success: false;
  state: TState;
  phase: "before_transition" | "after_transition";
  path: TPath;
  message?: string;
};

export type ConstraintResult<
  TState extends object,
  TPath extends Path<TState> = Path<TState>,
> = ConstraintSuccess<TState, TPath> | ConstraintFailure<TState, TPath>;

export type ConstraintFn<
  TState extends object,
  TPath extends Path<TState> = Path<TState>,
> = (
  path: TPath,
  state: TState,
  phase: "before_transition" | "after_transition",
) => ConstraintResult<TState, TPath>;

export type Constraint<
  TState extends object,
  TPath extends Path<TState> = Path<TState>,
> = {
  phase: "before_transition" | "after_transition";
  path: TPath;
  validation: Schema<Value<TState, TPath>> | ConstraintFn<TState, TPath>;
  message?: string;
};

export interface IConstraintRepository {
  readonly apply: <
    TState extends object,
    TPath extends Path<TState> = Path<TState>,
  >(
    constraint: Constraint<TState, TPath>,
    state: TState,
    path: TPath,
    phase: "before_transition" | "after_transition",
  ) => ConstraintResult<TState, TPath>;

  readonly createImperative: <
    TState extends object,
    TPath extends Path<TState> = Path<TState>,
  >(
    fn: (
      value: Value<TState, TPath>,
      state: TState,
    ) => { success: boolean; message?: string },
  ) => ConstraintFn<TState, TPath>;

  readonly formatResult: <
    TState extends object,
    TPath extends Path<TState> = Path<TState>,
  >(args: {
    isValid: boolean;
    state: TState;
    phase: "before_transition" | "after_transition";
    path: TPath;
    message?: string;
  }) => ConstraintResult<TState, TPath>;

  readonly makeExecutable: <
    TState extends object,
    TPath extends Path<TState> = Path<TState>,
  >(
    constraint: Constraint<TState, TPath>,
  ) => ConstraintFn<TState, TPath>;
}
