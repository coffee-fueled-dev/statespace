import { executableTransition } from "./transitions";
import type { Transition, TransitionFn } from "./transitions";
import Ajv, { type JSONSchemaType } from "ajv";
import { z } from "zod/v4";

const ajv = new Ajv({
  strict: false,
  validateSchema: false,
});

export type Schema<T> = JSONSchemaType<T> | z.core.JSONSchema.BaseSchema;

export type StateSpace<T extends object> = {
  shape: Schema<T>;
  transitions: Transition<T>[];
};

export interface ExecutableStateSpace<T extends object> {
  transitions: TransitionFn<T>[];
  shape: Schema<T>;
}

export const executableStateSpace = <T extends object>(
  system: StateSpace<T>
): ExecutableStateSpace<T> => ({
  shape: system.shape,
  transitions: system.transitions.map((transition) =>
    executableTransition(transition, ajv.compile(system.shape))
  ),
});
