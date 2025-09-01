import { z } from "zod";
import { SerializableSchema } from "./schema.zod";

const pathDescription =
  "A dot-notation reference to a nested property of the system. " +
  'Example:\n{ "a": { "b": { "c": 1 } } }\n' +
  "Path: 'a.b.c' or 'a.b'\n" +
  "The value of the path will be validated against the schema that describes the system. " +
  "In order for this constraint to pass, the validator must resolve to true.";

export const ConstraintSchema = z.object({
  phase: z
    .enum(["before_transition", "after_transition"])
    .describe(
      "The phase of the transition during which this constraint is applied relative to the effect. \n" +
        "before_transition: \n" +
        "Constraints evaluated before_transition are performed against the current state. \n" +
        "after_transition: \n" +
        "Constraints evaluated after_transition are performed against the new state after the effect is applied."
    ),
  path: z.string().describe(pathDescription),
  validation: SerializableSchema.describe(
    "A subset of Ajv compatible JSON Schema (drafts 04, 06, 07, 2019-09 and 2020-12) " +
      "that describes the properties of the path for which this constraint is valid."
  ),
  message: z
    .string()
    .optional()
    .describe(
      "Optional custom error message to display when the constraint fails."
    ),
});

export type SerializableConstraint = z.infer<typeof ConstraintSchema>;
