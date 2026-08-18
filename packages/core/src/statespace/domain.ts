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

export interface IStateSpaceRepository {
  readonly makeExecutable: <TState extends object>(
    stateSpace: StateSpace<TState>,
  ) => ExecutableStateSpace<TState>;
}
