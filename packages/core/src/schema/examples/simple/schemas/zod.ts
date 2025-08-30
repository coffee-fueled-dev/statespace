import z from "zod/v4";
import { type Constraint, type Effect, type StateSpace } from "../../..";

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
        symbol: "a.b.c",
        operation: "add",
        value: 1,
      } satisfies Effect<System, "a.b.c">,
      constraints: [
        {
          phase: "before_transition",
          symbol: "a.b",
          shape: z.toJSONSchema(SystemSchema.shape.a.shape.b),
        } satisfies Constraint<System, "a.b">,
        {
          phase: "before_transition",
          symbol: "a.b.c",
          shape: (symbolValue, _state) => {
            return (
              typeof symbolValue === "number" &&
              symbolValue >= 0 &&
              symbolValue <= 100
            );
          },
        } satisfies Constraint<System, "a.b.c">,
      ],
    },
  ],
} satisfies StateSpace<System>;
