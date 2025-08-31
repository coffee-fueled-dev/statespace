import { pathValue, type Path, type Value } from "./paths";
import Ajv from "ajv";
import type { Schema } from "./schema";

const ajv = new Ajv({
  strict: false,
  validateSchema: false,
});

export type ConstraintSuccess<T extends object, S extends Path<T>> = {
  success: true;
  state: T;
  phase: "before_transition" | "after_transition";
  path: S;
};
export type ConstraintFailure<T extends object, S extends Path<T>> = {
  success: false;
  state: T;
  phase: "before_transition" | "after_transition";
  path: S;
  message?: string;
};
export type ConstraintResult<T extends object, S extends Path<T>> =
  | ConstraintSuccess<T, S>
  | ConstraintFailure<T, S>;

export type ConstraintFn<T extends object, S extends Path<T>> = (
  path: S,
  state: T,
  phase: "before_transition" | "after_transition"
) => ConstraintResult<T, S>;

export type Constraint<T extends object, S extends Path<T> = Path<T>> = {
  phase: "before_transition" | "after_transition";
  path: S;
  schema: Schema<Value<T, S>> | ConstraintFn<T, S>;
  message?: string;
};

export function constraintResult<T extends object, S extends Path<T>>({
  isValid,
  state,
  phase,
  path,
  message,
}: {
  isValid: boolean;
  state: T;
  phase: "before_transition" | "after_transition";
  path: S;
  message?: string;
}): ConstraintResult<T, S> {
  if (isValid) {
    return {
      success: true,
      state,
      phase,
      path,
    };
  } else {
    return {
      success: false,
      state,
      phase,
      path,
      message: message || "Constraint validation failed",
    };
  }
}

export function createConstraintFn<T extends object, S extends Path<T>>(
  fn: (value: Value<T, S>, state: T) => { success: boolean; message?: string }
): ConstraintFn<T, S> {
  return (path, state, phase) => {
    const value = pathValue(path, state);
    const result = fn(value, state);

    return constraintResult({
      isValid: result.success,
      state,
      phase,
      path,
      message: result.message,
    });
  };
}

export function executableConstraint<T extends object, S extends Path<T>>(
  constraint: Constraint<T, S>
): ConstraintFn<T, S> {
  return (path, state, phase) => {
    if (typeof constraint.schema === "function") {
      return constraint.schema(path, state, phase);
    }
    const value = pathValue(path, state);
    const validator = ajv.compile(constraint.schema);
    const isValid = validator(value);

    const errorMessage =
      validator.errors
        ?.map((err) => `${err.instancePath} ${err.message}`)
        .join(", ") || "Validation failed";

    return constraintResult({
      isValid,
      state,
      phase,
      path,
      message: errorMessage,
    });
  };
}
