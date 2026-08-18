import { produce } from "immer";
import { PathRepository } from "../path/adapters";
import type { Path, Value } from "../path/domain";

export const mergeValue = <T extends object, P extends Path<T>>(
  state: T,
  path: P,
  nextValue: Value<T, P>,
): T => {
  return produce(state, (draft) => {
    const segments = PathRepository.parsePathSegments(path);
    let current: object = draft;

    const childAt = (
      parent: object,
      segment: { type: "property"; key: string } | { type: "index"; index: number },
    ): object => {
      const next =
        segment.type === "property"
          ? (parent as Record<string, unknown>)[segment.key]
          : (parent as unknown[])[segment.index];
      if (typeof next !== "object" || next === null) {
        throw new Error(`Invalid path: ${String(path)}`);
      }
      return next;
    };

    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      if (!segment) throw new Error(`Invalid path: ${String(path)}`);
      current = childAt(current, segment);
    }

    const lastSegment = segments[segments.length - 1];
    if (!lastSegment) throw new Error(`Invalid path: ${String(path)}`);
    if (lastSegment.type === "property") {
      (current as Record<string, unknown>)[lastSegment.key] = nextValue;
    } else {
      (current as unknown[])[lastSegment.index] = nextValue;
    }
  });
};

export const validateMutation = <T extends object, P extends Path<T>>(
  path: P,
  state: T,
  nextValue: Value<T, P>,
): Value<T, P> => {
  if (!operationMaintainsType(nextValue, path, state)) {
    const currentValue = PathRepository.valueFromPath(path, state);
    throw new Error(
      `Mutation of path '${String(
        path,
      )}' resulted in incompatible type. Expected ${typeof currentValue}, got ${typeof nextValue}`,
    );
  }
  return nextValue;
};

const operationMaintainsType = <T extends object, P extends Path<T>>(
  value: unknown,
  path: P,
  object: T,
): value is Value<T, P> => {
  if (!PathRepository.isPath(path, object)) {
    return false;
  }

  // Get the current value at the path path to infer the expected type
  const currentValue = PathRepository.valueFromPath(path, object);

  // Basic runtime type checking
  if (typeof currentValue === "number") {
    return typeof value === "number";
  }
  if (typeof currentValue === "string") {
    return typeof value === "string";
  }
  if (typeof currentValue === "boolean") {
    return typeof value === "boolean";
  }
  if (currentValue === null) {
    return value === null;
  }
  if (currentValue === undefined) {
    return value === undefined;
  }
  if (typeof currentValue === "object") {
    return typeof value === "object" && value !== null;
  }
  if (Array.isArray(currentValue)) {
    return Array.isArray(value);
  }

  // For other types, just check they're the same type
  return typeof value === typeof currentValue;
};
