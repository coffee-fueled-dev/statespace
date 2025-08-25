import { z } from "zod";
import type { ConstraintFn } from "./types";
import { NumberValidationSchema, ValidationSchema } from "../schema/schema.zod";
import type { Schema, Shape } from "../schema";
import type { DeepKeys } from "../shared/lib";

export type Phase = z.infer<typeof PhaseSchema>;
export const PhaseSchema = z
  .enum(["before_transition", "after_transition"])
  .default("before_transition");

export type PathConstraint<TShape extends Shape<Schema>> = Omit<
  z.infer<typeof PathConstraintSchema>,
  "path"
> & {
  path: DeepKeys<TShape>;
};
export const PathConstraintSchema = z.object({
  phase: PhaseSchema.describe(
    "The phase of the transition during which the constraint is evaluated. " +
      "before_transition is evaluated before state is applied. " +
      "This is useful for limiting the ability to apply a transition based on what is currently true in the system. " +
      "after_transition is evaluated against the proposed new state. " +
      "This is useful for limiting the ability to apply a transition based on what will be true in the system after the transition is applied. "
  ),
  type: z.literal("path"),
  path: z
    .string()
    .describe("The dot-notation path to the state property to validate."),
  require: ValidationSchema,
});

export type CostConstraint = z.infer<typeof CostConstraintSchema>;
export const CostConstraintSchema = z.object({
  type: z.literal("cost"),
  require: NumberValidationSchema,
});

// Custom validations are only available when writing configs manually
export type CustomValidation<TSchema extends Schema> = {
  type: "custom";
  require: ConstraintFn<TSchema>;
};

// Custom constraints are only available when writing configs manually
export type CustomConstraint<TSchema extends Schema> = {
  phase?: Phase;
  type: "custom";
  require: CustomValidation<TSchema>;
};

export type Constraint<TSchema extends Schema> =
  | z.infer<typeof ConstraintSchema>
  | CustomConstraint<TSchema>;
export const ConstraintSchema = z.discriminatedUnion("type", [
  PathConstraintSchema,
  CostConstraintSchema,
]);
