import type { Transition, TransitionFn } from "../transition/domain";
import { type JSONSchemaType } from "ajv";

export type Schema<T> = JSONSchemaType<T>;

export type StateSpace<TState extends object> = {
  shape: Schema<TState>;
  transitions: Transition<TState>[];
};

export interface ExecutableStateSpace<TState extends object> {
  transitions: TransitionFn<TState>[];
  shape: Schema<TState>;
}

export interface IStateSpaceRepository {
  readonly makeExecutable: <TState extends object>(
    stateSpace: StateSpace<TState>,
  ) => ExecutableStateSpace<TState>;
}
