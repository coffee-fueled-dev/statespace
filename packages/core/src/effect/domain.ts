import type { Path, Value } from "../path/domain";
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

export type EffectResult<TState extends object> = EffectSuccess<TState> | EffectFailure;

/** Whole-state transform; receives and may replace the entire state. */
export type TransformFn<TState extends object> = (
  state: TState,
  context?: unknown,
) => EffectResult<TState>;

type NumericEffect<TState extends object, P extends Path<TState>> = {
  path: P;
  operation: "add" | "subtract" | "multiply" | "divide";
  value: number;
  meta?: Metadata;
  cost?: number;
};

type StringEffect<TState extends object, P extends Path<TState>> = {
  path: P;
  operation: "prepend" | "append" | "cut";
  value: string;
  meta?: Metadata;
  cost?: number;
};

type SetEffect<TState extends object, P extends Path<TState>> = {
  path: P;
  operation: "set";
  value: Value<TState, P> | `$${Path<TState>}`;
  meta?: Metadata;
  cost?: number;
};

/** Path-focused ops for a single path (no transform). */
type EffectForPath<TState extends object, P extends Path<TState>> =
  | SetEffect<TState, P>
  | (Value<TState, P> extends number ? NumericEffect<TState, P> : never)
  | (Value<TState, P> extends string ? StringEffect<TState, P> : never);

export type PathEffect<TState extends object> = {
  [P in Path<TState>]: EffectForPath<TState, P>;
}[Path<TState>];

export type TransformEffect<TState extends object> = {
  operation: "transform";
  transform: TransformFn<TState>;
  meta?: Metadata;
  cost?: number;
};

export type Effect<TState extends object> = PathEffect<TState> | TransformEffect<TState>;

export function isPathEffect<TState extends object>(
  effect: Effect<TState>,
): effect is PathEffect<TState> {
  return "path" in effect;
}

export function isTransformEffect<TState extends object>(
  effect: Effect<TState>,
): effect is TransformEffect<TState> {
  return effect.operation === "transform";
}

export interface IEffectRepository {
  readonly makeExecutable: <TState extends object>(
    effect: Effect<TState>,
  ) => (state: TState, context?: unknown) => EffectResult<TState>;

  readonly apply: <TState extends object>(
    state: TState,
    transition: Transition<TState>,
    validator: (state: TState) => boolean,
    context?: unknown,
  ) => EffectResult<TState>;

  readonly resolveValue: <TState extends object>(
    effect: PathEffect<TState>,
    state: TState,
  ) => Value<TState, Path<TState>>;
}
