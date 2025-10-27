import { type Path, type Value } from "../path/domain";
import type { Transition } from "../transition/domain";
export type Scalar = number | string | boolean | undefined | null;
export type Metadata = Record<string, Scalar>;

export type EffectSuccess<TState extends object> = {
  success: true;
  state: TState;
  meta?: Metadata;
};

export type EffectFailure = {
  success: false;
  error: string;
};

export type EffectResult<TState extends object> =
  | EffectSuccess<TState>
  | EffectFailure;

export type EffectFn<TState extends object> = (
  path: Path<TState>,
  state: TState
) => EffectResult<TState>;

// A helper type that defines all valid effects for a SINGLE path
type EffectForPath<TState extends object, P extends Path<TState>> =
  | {
      path: P;
      operation: "set";
      value: Value<TState, P> | `$${Path<TState>}`;
      meta?: Metadata;
      cost?: number;
    }
  | (Value<TState, P> extends number
      ? {
          path: P;
          operation: "add" | "subtract" | "multiply" | "divide";
          value: number;
          meta?: Metadata;
          cost?: number;
        }
      : never)
  | (Value<TState, P> extends string
      ? {
          path: P;
          operation: "prepend" | "append" | "cut";
          value: string;
          meta?: Metadata;
          cost?: number;
        }
      : never)
  | {
      path: P;
      operation: "transform";
      value: EffectFn<TState>;
      meta?: Metadata;
      cost?: number;
    };

// The main Effect type becomes a union of all possible effects for all paths
export type Effect<TState extends object> = {
  [P in Path<TState>]: EffectForPath<TState, P>;
}[Path<TState>];

export interface IEffectRepository {
  readonly createImperative: <TState extends object>(
    fn: (
      value: Value<TState, Path<TState>>,
      state: TState
    ) => EffectResult<TState>
  ) => EffectFn<TState>;

  readonly makeExecutable: <TState extends object>(
    effect: Effect<TState>
  ) => EffectFn<TState>;

  readonly apply: <
    TState extends object,
    TPath extends Path<TState> = Path<TState>
  >(
    state: TState,
    path: TPath,
    transition: Transition<TState>,
    validator: (state: TState) => boolean
  ) => EffectResult<TState>;

  readonly resolveValue: <TState extends object>(
    effect: Effect<TState>,
    state: TState
  ) => Value<TState, Path<TState>>;
}
