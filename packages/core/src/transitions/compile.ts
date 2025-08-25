import { makeExecutableConstraint, type ConstraintFn } from "../constraints";
import { makeExecutableEffect, type Effect, type EffectFn } from "../effects";
import type { Schema } from "../schema";
import type { Shape } from "../schema/types";
import type { Metadata } from "../shared/schema.zod";
import type { Transition, TransitionCost } from "./schema.zod";

export type ExecutableTransition<TSchema extends Schema> = {
  name: string;
  constraint: ConstraintFn<TSchema>;
  effect: EffectFn<TSchema>;
  cost?: TransitionCost<TSchema>;
  metadata?: Metadata | null | undefined;
};
export const makeExecutableTransition = <TSchema extends Schema>({
  constraints,
  effects,
  name,
  cost,
  metadata,
}: Transition<TSchema>): ExecutableTransition<TSchema> => ({
  name,
  constraint: makeExecutableConstraint<TSchema>({
    constraints,
  }),
  effect: makeExecutableEffect<TSchema>({
    effects: effects as Effect<TSchema>[],
  }),
  cost: typeof cost === "function" ? (state) => cost(state) : cost || 0,
  metadata,
});
