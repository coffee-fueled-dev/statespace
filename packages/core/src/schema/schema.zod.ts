import z from "zod";

export type DateValidation = z.infer<typeof DateValidationSchema>;
export const DateValidationSchema = z.object({
  type: z.literal("date"),
  require: z
    .discriminatedUnion("operator", [
      z.object({
        operator: z.enum(["before", "after"]),
        args: z
          .string()
          .describe("ISO date string (e.g., '2023-12-25T10:00:00Z')"),
      }),
      z.object({
        operator: z.enum(["between"]),
        args: z.object({
          start: z
            .string()
            .describe("ISO date string (e.g., '2023-12-25T10:00:00Z')"),
          end: z
            .string()
            .describe("ISO date string (e.g., '2023-12-25T10:00:00Z')"),
        }),
      }),
    ])
    .nullish(),
});

export type NumberValidation = z.infer<typeof NumberValidationSchema>;
export const NumberValidationSchema = z.object({
  type: z.literal("number"),
  require: z
    .array(
      z.discriminatedUnion("operator", [
        z.object({
          operator: z.enum(["lt", "lte", "gt", "gte", "multipleOf"]),
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
    .nullish(),
});

export type StringValidation = z.infer<typeof StringValidationSchema>;
export const StringValidationSchema = z.object({
  type: z.literal("string"),
  require: z
    .array(
      z.discriminatedUnion("operator", [
        z.object({
          operator: z.enum(["maxLength", "minLength", "length"]),
          args: z.number(),
        }),
        z.object({
          operator: z.enum(["includes", "startsWith", "endsWith"]),
          args: z.string(),
        }),
        z.object({
          operator: z.enum(["lowercase", "uppercase"]),
        }),
      ])
    )
    .nullish(),
});

export type BooleanValidation = z.infer<typeof BooleanValidationSchema>;
export const BooleanValidationSchema = z.object({
  type: z.literal("boolean"),
  require: z
    .discriminatedUnion("operator", [
      z.object({ operator: z.literal("true") }),
      z.object({ operator: z.literal("false") }),
    ])
    .nullish(),
});

export type ArrayValidation = z.infer<typeof ArrayValidationSchema>;
export const ArrayValidationSchema = z.object({
  type: z.literal("array"),
  require: z
    .array(
      z.discriminatedUnion("operator", [
        z.object({
          operator: z.literal("length"),
          args: z.object({
            method: z.enum(["lt", "lte", "gt", "gte", "eq"]),
            value: z.number(),
          }),
        }),
        z.object({
          operator: z.literal("shape"),
          value: z.discriminatedUnion("type", [
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
            z.object({
              type: z.literal("object"),
              require: z.record(
                z.string(),
                z.discriminatedUnion("type", [
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
                ])
              ),
            }),
            z.object({
              type: z.literal("array"),
              require: z.array(
                z.discriminatedUnion("operator", [
                  z.object({ operator: z.literal("nonempty") }),
                  z.object({ operator: z.literal("empty") }),
                  z.object({
                    operator: z.literal("length"),
                    value: z.number(),
                  }),
                  z.object({
                    operator: z.literal("shape"),
                    value: z.discriminatedUnion("type", [
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
                      z.object({
                        type: z.literal("object"),
                        require: z.record(
                          z.string(),
                          z.discriminatedUnion("type", [
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
                          ])
                        ),
                      }),
                    ]),
                  }),
                ])
              ),
            }),
          ]),
        }),
      ])
    )
    .nullish(),
});

export type ObjectValidation = z.infer<typeof ObjectValidationSchema>;
export const ObjectValidationSchema = z.object({
  type: z.literal("object"),
  require: z.record(
    z.string(),
    z.discriminatedUnion("type", [
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
      z.object({
        type: z.literal("object"),
        require: z.record(
          z.string(),
          z.discriminatedUnion("type", [
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
          ])
        ),
      }),
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
  ObjectValidationSchema,
]);

export type Schema = z.infer<typeof SchemaSchema>;
export const SchemaSchema = z.record(
  z.string(),
  z.union([ValidationSchema, z.record(z.string(), ValidationSchema)])
);
