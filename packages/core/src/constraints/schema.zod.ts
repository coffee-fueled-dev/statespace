import { z } from "zod/v4";
import type { System } from "../shared/types";
import type { ConstraintFn } from "./types";

export type Phase = z.infer<typeof PhaseSchema>;
export const PhaseSchema = z
  .enum(["before_transition", "after_transition"])
  .describe("Phase of the transition. Defaults to after_transition.");

export type ArrayValidation = z.infer<typeof ArrayValidationSchema>;
const ArrayValidationSchema = z.object({
  type: z.literal("array"),
  require: z.optional(
    z.array(
      z.discriminatedUnion("operator", [
        z.object({ operator: z.enum(["nonempty", "empty"]) }),
      ])
    )
  ),
});

export type DateValidation = z.infer<typeof DateValidationSchema>;
const DateValidationSchema = z.object({
  type: z.literal("date"),
  require: z.optional(
    z.discriminatedUnion("operator", [
      z.object({
        operator: z.enum(["before", "after"]),
        args: z.date(),
      }),
      z.object({
        operator: z.enum(["between"]),
        args: z.object({
          start: z.date(),
          end: z.date(),
        }),
      }),
    ])
  ),
});

export type NumberValidation = z.infer<typeof NumberValidationSchema>;
const NumberValidationSchema = z.object({
  type: z.literal("number"),
  require: z.optional(
    z.array(
      z.discriminatedUnion("operator", [
        z.object({
          operator: z.enum([
            "lt",
            "lte",
            "gt",
            "gte",
            "multipleOf",
            "maxSize",
            "minSize",
            "size",
          ]),
          args: z.number(),
        }),
        z.object({
          operator: z.enum([
            "positive",
            "negative",
            "nonpositive",
            "nonnegative",
          ]),
        }),
      ])
    )
  ),
});

export type StringValidation = z.infer<typeof StringValidationSchema>;
const StringValidationSchema = z.object({
  type: z.literal("string"),
  require: z.optional(
    z.array(
      z.discriminatedUnion("operator", [
        z.object({
          operator: z.enum(["maxLength", "minLength", "length"]),
          args: z.number(),
        }),
        z.object({
          operator: z.enum(["includes", "startsWith", "endsWith", "mime"]),
          args: z.string(),
        }),
        z.object({
          operator: z.enum(["lowercase", "uppercase"]),
        }),
      ])
    )
  ),
});

export type BooleanValidation = z.infer<typeof BooleanValidationSchema>;
const BooleanValidationSchema = z.object({
  type: z.literal("boolean"),
  require: z.optional(
    z.discriminatedUnion("operator", [
      z.object({ operator: z.literal("true") }),
      z.object({ operator: z.literal("false") }),
    ])
  ),
});

export type Validation = z.infer<typeof ValidationSchema>;
export const ValidationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("undefined"),
  }),
  z.object({
    type: z.literal("null"),
  }),
  BooleanValidationSchema,
  NumberValidationSchema,
  DateValidationSchema,
  StringValidationSchema,
  ArrayValidationSchema,
]);

export type PathConstraint = z.infer<typeof PathConstraintSchema>;
export const PathConstraintSchema = z.object({
  phase: z
    .optional(PhaseSchema)
    .describe(
      "The phase of the transition during which the constraint is evaluated. " +
        "before_transition is evaluated before state is applied. " +
        "This is useful for limiting the ability to apply a transition based on what is currently true in the system. " +
        "after_transition is evaluated against the proposed new state. " +
        "This is useful for limiting the ability to apply a transition based on what will be true in the system after the transition is applied. " +
        "Defaults to before_transition."
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

// These are only available when writing configs manually
export type CustomValidation<TSystem extends System> = {
  type: "custom";
  require: ConstraintFn<TSystem>;
};

export type CustomConstraint<TSystem extends System> = {
  phase?: Phase;
  type: "custom";
  require: CustomValidation<TSystem>;
};

export type Constraint<TSystem extends System> =
  | PathConstraint
  | CostConstraint
  | CustomConstraint<TSystem>;
