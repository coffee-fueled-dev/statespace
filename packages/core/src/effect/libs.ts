import { produce } from "immer";
import { PathRepository } from "../path/adapters";
import type { Path, Value } from "../path/domain";

export const mergeValue = <T extends object, P extends Path<T>>(
  state: T,
  path: P,
  nextValue: Value<T, P>,
): T => {
  return produce(state, (draft) => {
    const keys = path.split(".");
    let current: any = draft;

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = nextValue;
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
