import type { MorphismError, ObjectValue, SemanticObject } from "./domain";
import { err, ok, type Result } from "./result";

/** Preserve literal object key unions from a const definition list. */
export function defineObjects<TState extends object>() {
  return <const TObjs extends readonly SemanticObject<TState, string>[]>(objects: TObjs): TObjs =>
    objects;
}

export function objectByKey<TState extends object>(
  objects: readonly SemanticObject<TState>[],
  key: string,
): SemanticObject<TState> | undefined {
  return objects.find((object) => object.key === key);
}

/**
 * Classify a state into exactly one object. Returns unclassified or ambiguous
 * errors when zero or multiple predicates match.
 */
export function classify<TState extends object>(
  state: TState,
  objects: readonly SemanticObject<TState>[],
): Result<ObjectValue<TState, string>, MorphismError> {
  const matches: SemanticObject<TState>[] = [];
  for (const object of objects) {
    if (object.contains(state)) matches.push(object);
  }
  if (matches.length === 0) {
    return err({ type: "unclassified", reason: "State is unclassified." });
  }
  if (matches.length > 1) {
    return err({ type: "ambiguous", keys: matches.map((m) => m.key) });
  }
  const match = matches[0];
  if (!match) {
    return err({ type: "unclassified", reason: "State is unclassified." });
  }
  return ok({ object: match.key, state });
}

/**
 * Classify and require a specific source key (wrong-source when classified
 * elsewhere).
 */
export function classifyAs<TState extends object, K extends string>(
  state: TState,
  objects: readonly SemanticObject<TState>[],
  expected: K,
): Result<ObjectValue<TState, K>, MorphismError> {
  if (!objectByKey(objects, expected)) {
    return err({ type: "unknown-object", key: expected });
  }
  const classified = classify(state, objects);
  if (!classified.ok) return classified;
  if (classified.value.object !== expected) {
    return err({
      type: "wrong-source",
      expected,
      actual: classified.value.object,
    });
  }
  return ok({ object: expected, state: classified.value.state });
}
