import z from "zod/v4";
import {
  type Constraint,
  type Effect,
  type StateSpace,
  createConstraintFn,
} from "../../..";

export type System = z.infer<typeof SystemSchema>;
export const SystemSchema = z.object({
  a: z.object({
    b: z.object({
      c: z.number(),
    }),
  }),
});

export const ZodDeclaration = {
  shape: z.toJSONSchema(SystemSchema),
  transitions: [
    {
      effect: {
        name: "increment",
        path: "a.b.c",
        operation: "add",
        value: 1,
      } satisfies Effect<System, "a.b.c">,
      constraints: [
        {
          phase: "before_transition",
          path: "a.b",
          schema: z.toJSONSchema(SystemSchema.shape.a.shape.b),
        } satisfies Constraint<System, "a.b">,
        {
          phase: "before_transition",
          path: "a.b.c",
          schema: createConstraintFn((value, _state) => {
            const isValidNumber = typeof value === "number" && !isNaN(value);
            const isInRange = value >= 0 && value <= 100;
            const isEvenNumber = value % 2 === 0;

            const isValid = isValidNumber && isInRange && isEvenNumber;

            return {
              success: isValid,
              message: isValid
                ? undefined
                : `Value must be an even number between 0 and 100 (got: ${value})`,
            };
          }),
        } satisfies Constraint<System, "a.b.c">,
      ],
    },
  ],
} satisfies StateSpace<System>;
