import type { JSONSchemaType } from "ajv";
import { symbolValue, type Symbol, type Value } from "./symbols";
import type { z } from "zod/v4";
import Ajv from "ajv";

const ajv = new Ajv();

export type ShapeSchema<T> = JSONSchemaType<T> | z.core.JSONSchema.BaseSchema;

export type ConstraintFn<T extends object, S extends Symbol<T>> = (
  symbol: S,
  state: T
) => boolean;

export type Constraint<T extends object, S extends Symbol<T> = Symbol<T>> = {
  phase: "before_transition" | "after_transition";
  symbol: S;
  shape: ShapeSchema<Value<T, S>> | ConstraintFn<T, S>;
};

export function executableConstraint<T extends object, S extends Symbol<T>>(
  constraint: Constraint<T, S>
): ConstraintFn<T, S> {
  return (symbol, state) => {
    if (typeof constraint.shape === "function") {
      return constraint.shape(symbol, state);
    }
    const value = symbolValue(symbol, state);
    const validator = ajv.compile(constraint.shape);
    return validator(value);
  };
}
