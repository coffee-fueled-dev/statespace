import { executableTransition } from "./transitions";
import type { ShapeSchema } from "./constraints";
import type { Transition, TransitionFn } from "./transitions";
import Ajv from "ajv";

const ajv = new Ajv();

export type StateSpace<T extends object> = {
  shape: ShapeSchema<T>;
  transitions: Transition<T>[];
};

export interface ExecutableStateSpace<T extends object> {
  transitions: TransitionFn<T>[];
}

export const executableStateSpace = <T extends object>(
  system: StateSpace<T>
): ExecutableStateSpace<T> => ({
  transitions: system.transitions.map((transition) =>
    executableTransition(transition, ajv.compile(system.shape))
  ),
});
