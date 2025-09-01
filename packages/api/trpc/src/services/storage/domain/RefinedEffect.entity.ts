import { z } from "zod";

const pathDescription =
  "A dot-notation reference to a nested property of the system. " +
  'Example:\n{ "a": { "b": { "c": 1 } } }\n' +
  "Path: 'a.b.c' or 'a.b'\n" +
  "This path will be the target of the effect operation. " +
  "The value returned by the effect must match the type for the path specified by the schema.";

const MetadataSchema = z
  .record(
    z.string(),
    z.union([z.number(), z.string(), z.boolean(), z.undefined(), z.null()])
  )
  .describe(
    "Metadata associated with the effect, containing scalar values only."
  );

const CostSchema = z
  .number()
  .optional()
  .describe("The cost of the effect, used for path finding and optimization.");

export type RefinedEffect = z.infer<typeof RefinedEffectSchema>;
export const RefinedEffectSchema = z
  .discriminatedUnion("operation", [
    z.object({
      name: z.string().describe("The name of the effect."),
      path: z.string().describe(pathDescription),
      operation: z.literal("set"),
      value: z
        .union([
          z.null(),
          z.boolean(),
          z.string(),
          z.number(),
          z.object({}),
          z.array(z.unknown()),
          z.string().regex(/^\$.+/, "Must start with $ for path reference"),
        ])
        .describe(
          "The current value of the path will be replaced with this value. " +
            "Can be a literal value or a path reference starting with '$' (e.g., '$other.path'). " +
            "When using a path reference, the value from the referenced path will be used for the modification."
        ),
      meta: MetadataSchema.optional(),
      cost: CostSchema,
    }),
    z.object({
      name: z.string().describe("The name of the effect."),
      path: z.string().describe(pathDescription),
      operation: z.enum(["add", "subtract", "multiply", "divide"]),
      value: z
        .number()
        .describe(
          "This value will be added to, subtracted from, multiplied by, or divided from the value of the path." +
            "Can be a literal value or a path reference starting with '$' (e.g., '$other.path'). " +
            "When using a path reference, the value from the referenced path will be used for the modification."
        ),
      meta: MetadataSchema.optional(),
      cost: CostSchema,
    }),
    z.object({
      name: z.string().describe("The name of the effect."),
      path: z.string().describe(pathDescription),
      operation: z.enum(["concat", "prepend", "append", "cut"]),
      value: z
        .string()
        .describe(
          "This value will be concatenated to, prepended to, appended to, or cut from the value of the path." +
            "Can be a literal value or a path reference starting with '$' (e.g., '$other.path'). " +
            "When using a path reference, the value from the referenced path will be used for the modification."
        ),
      meta: MetadataSchema.optional(),
      cost: CostSchema,
    }),
  ])
  .describe("An effect that modifies the system.");
