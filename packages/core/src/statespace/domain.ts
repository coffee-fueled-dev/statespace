import type { JSONSchemaType } from "ajv";
import type { Transition, TransitionResult, TransitionSuccess } from "../transition/domain";

export type Schema<T> = JSONSchemaType<T>;

export type StateSpace<TState extends object> = {
  shape: Schema<TState>;
  transitions: Transition<TState>[];
};

export interface ExecutableStateSpace<TState extends object> {
  shape: Schema<TState>;
  transitions: Transition<TState>[];
  apply(state: TState, name: string, context?: unknown): TransitionResult<TState>;
  enabled(state: TState, context?: unknown): TransitionSuccess<TState>[];
}

/**
 * State space with the state parameter erased.
 * Use for heterogeneous registries (catalogs, kernels) where many
 * StateSpace<T_i> share one Map. Not a covariant subtype of StateSpace<object>.
 *
 * Prefer `StateSpace<T>` at machine definition sites. Use `AnyStateSpace` /
 * `eraseStateSpace` only when putting spaces into a mixed collection.
 */
// biome-ignore lint/suspicious/noExplicitAny: intentional erase for heterogeneous registries
export type AnyStateSpace = StateSpace<any>;

/**
 * Erase T for registry storage. Prefer this over casting to StateSpace<object>.
 * Accepts a structural shape so unions of StateSpace<T_i> type-check
 * (AJV JSONSchemaType blocks StateSpace<T> assigning to StateSpace<any> otherwise).
 */
export function eraseStateSpace(space: {
  readonly shape: unknown;
  readonly transitions: readonly unknown[];
}): AnyStateSpace {
  return space as AnyStateSpace;
}

/**
 * Executable state space with the state parameter erased.
 * Same registry use case as AnyStateSpace. Calling apply/enabled on an erased
 * space means you are responsible for passing a state that matches the original T.
 */
// biome-ignore lint/suspicious/noExplicitAny: intentional erase for heterogeneous registries
export type AnyExecutableStateSpace = ExecutableStateSpace<any>;

/** Erase T for registry storage. Prefer this over casting to ExecutableStateSpace<object>. */
export function eraseExecutableStateSpace<TState extends object>(
  space: ExecutableStateSpace<TState>,
): AnyExecutableStateSpace {
  // AJV JSONSchemaType keeps Schema<T> from assigning to Schema<any>; erase here.
  return space as AnyExecutableStateSpace;
}

export interface IStateSpaceRepository {
  readonly makeExecutable: <TState extends object>(
    stateSpace: StateSpace<TState>,
  ) => ExecutableStateSpace<TState>;
}
