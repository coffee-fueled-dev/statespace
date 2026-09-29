import type { ExecutableStateSpace, Schema, StateSpace } from "../statespace/domain";
import type { Result } from "./result";

export type MorphismError =
  | { type: "unavailable"; reason: string }
  | { type: "unclassified"; reason: string }
  | { type: "ambiguous"; keys: readonly string[] }
  | { type: "wrong-source"; expected: string; actual: string }
  | { type: "invalid-target"; expected: string; actual?: string }
  | { type: "unknown-object"; key: string }
  | { type: "effect-failed"; cause: string }
  | { type: "compose"; reason: string };

/** Certified membership of `state` in semantic object `object`. */
export type ObjectValue<TState extends object, K extends string> = {
  readonly object: K;
  readonly state: TState;
};

export type SemanticObject<TState extends object, K extends string = string> = {
  readonly key: K;
  readonly contains: (state: TState) => boolean;
};

/**
 * Declarative morphism. `run` returns the next raw state; the category seals
 * source membership and target closure around it.
 */
export type MorphismDef<
  TState extends object,
  TContext = unknown,
  S extends string = string,
  T extends string = string,
  TParams = undefined,
> = {
  readonly name: string;
  readonly source: S;
  readonly target: T;
  readonly run: (
    value: ObjectValue<TState, S>,
    context: TContext,
    params: TParams,
  ) => Result<TState, MorphismError>;
};

/**
 * Instantiated arrow: params closed; run is total into Result.
 * Context stays `unknown` (same as StateSpace.apply) so arrows compose in
 * heterogeneous lists; typed context is enforced by the sealed definition.
 */
export type Arrow<
  TState extends object,
  S extends string = string,
  T extends string = string,
  TParams = unknown,
> = {
  readonly name: string;
  readonly source: S;
  readonly target: T;
  readonly params?: TParams;
  readonly run: (
    value: ObjectValue<TState, string>,
    context?: unknown,
  ) => Result<ObjectValue<TState, string>, MorphismError>;
};

export type CompositionCertificate = {
  readonly ok: boolean;
  readonly source?: string;
  readonly target?: string;
  readonly intermediates: readonly string[];
  readonly steps: readonly string[];
  readonly error?: string;
};

export type MorphismSpace<
  TState extends object,
  TArrows extends readonly Arrow<TState>[] = readonly Arrow<TState>[],
> = {
  readonly objects: readonly SemanticObject<TState>[];
  readonly morphisms: TArrows;
  readonly stateSpace: StateSpace<TState>;
  readonly shape: Schema<TState>;
  readonly arrowOf: (name: TArrows[number]["name"]) => TArrows[number] | undefined;
  readonly makeExecutable: () => ExecutableStateSpace<TState>;
};

/** Format a typed morphism error for TransitionResult.error. */
export function formatMorphismError(error: MorphismError): string {
  switch (error.type) {
    case "unavailable":
      return error.reason;
    case "unclassified":
      return error.reason;
    case "ambiguous":
      return `Ambiguous region: ${error.keys.join(", ")}`;
    case "wrong-source":
      return `Expected region ${error.expected}, got ${error.actual}`;
    case "invalid-target":
      return error.actual
        ? `Effect left region ${error.actual}; expected ${error.expected}`
        : `Effect left unclassified region; expected ${error.expected}`;
    case "unknown-object":
      return `Unknown object: ${error.key}`;
    case "effect-failed":
      return error.cause;
    case "compose":
      return error.reason;
  }
}
