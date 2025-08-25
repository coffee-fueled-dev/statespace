import { z } from "zod";
import { ConstraintSchema, type Constraint } from "../constraints/schema.zod";
import { EffectSchema, type Effect } from "../effects";
import { MetadataSchema, type Metadata } from "../shared/schema.zod";
import type { Schema, Shape } from "../schema";

/**
 * A function that calculates the cost of a transition based on the system's
 * state.
 */
export type CostFn<TSystem extends Shape<Schema>> = (
  systemState: TSystem
) => number;

export type TransitionCost<TSchema extends Schema> =
  | number
  | null
  | undefined
  | CostFn<Shape<TSchema>>;

// Cost functions are only available when writing configs manually
export type Transition<TSchema extends Schema> = {
  name: string;
  constraints: Constraint<TSchema>[];
  effects: Effect<TSchema>[];
  cost?: TransitionCost<TSchema>;
  metadata?: Metadata | null | undefined;
};
export const TransitionSchema = z.object({
  name: z.string().describe("The name of the transition rule."),
  constraints: z.array(ConstraintSchema),
  effects: z
    .array(EffectSchema)
    .describe(
      "Describe the proposed state of the system after the transition is applied. " +
        "You may define transforms that mutate the current state to produce some next state " +
        "or you may provide a completely new state. " +
        "If you provide a next state, it must be a complete state object that satisfies the schema. " +
        "If you define a definitive next state, that state will always be applied when the transition is applied."
    ),
  cost: z
    .number()
    .nullish()
    .describe(
      "The cost of the transition. " +
        "This is a number that represents the cost of the transition. " +
        "The lower the cost, the more desirable the transition."
    ),
  metadata: MetadataSchema.nullish().describe("Metadata for the transition."),
});
