import { z } from "zod";

// Base scalar JSON Schema types
const StringMetaSchema = z.object({
  type: z.literal("string"),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
  format: z.string().optional(),
});

const NumberMetaSchema = z.object({
  type: z.literal("number"),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  multipleOf: z.number().optional(),
});

const IntegerMetaSchema = z.object({
  type: z.literal("integer"),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  multipleOf: z.number().optional(),
});

const BooleanMetaSchema = z.object({
  type: z.literal("boolean"),
});

const NullMetaSchema = z.object({
  type: z.literal("null"),
});

// Define base shape for recursion
type BaseSchema =
  | z.infer<typeof StringMetaSchema>
  | z.infer<typeof NumberMetaSchema>
  | z.infer<typeof IntegerMetaSchema>
  | z.infer<typeof BooleanMetaSchema>
  | z.infer<typeof NullMetaSchema>;

// Define recursive shape types
type ArraySchema = {
  type: "array";
  items: JSONSchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
};

type ObjectSchema = {
  type: "object";
  properties?: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean | JSONSchema;
  minProperties?: number;
  maxProperties?: number;
};

type CompositionSchema =
  | { anyOf: JSONSchema[] }
  | { oneOf: JSONSchema[] }
  | { allOf: JSONSchema[] };

// Create the recursive schemas using z.lazy
const ArrayMetaSchema: z.ZodType<ArraySchema> = z.lazy(() =>
  z.object({
    type: z.literal("array"),
    items: JSONSchemaMetaSchema,
    minItems: z.number().optional(),
    maxItems: z.number().optional(),
    uniqueItems: z.boolean().optional(),
  })
);

const ObjectMetaSchema: z.ZodType<ObjectSchema> = z.lazy(() =>
  z.object({
    type: z.literal("object"),
    properties: z.record(z.string(), JSONSchemaMetaSchema).optional(),
    required: z.array(z.string()).optional(),
    additionalProperties: z
      .union([z.boolean(), JSONSchemaMetaSchema])
      .optional(),
    minProperties: z.number().optional(),
    maxProperties: z.number().optional(),
  })
);

const AnyOfSchema = z.lazy(() =>
  z.object({
    anyOf: z.array(JSONSchemaMetaSchema),
  })
);

const OneOfSchema = z.lazy(() =>
  z.object({
    oneOf: z.array(JSONSchemaMetaSchema),
  })
);

const AllOfSchema = z.lazy(() =>
  z.object({
    allOf: z.array(JSONSchemaMetaSchema),
  })
);

// Main Schema definition
export type JSONSchema =
  | BaseSchema
  | ArraySchema
  | ObjectSchema
  | CompositionSchema;
export const JSONSchemaMetaSchema: z.ZodType<JSONSchema> = z.union([
  StringMetaSchema,
  NumberMetaSchema,
  IntegerMetaSchema,
  BooleanMetaSchema,
  NullMetaSchema,
  ArrayMetaSchema,
  ObjectMetaSchema,
  AnyOfSchema,
  OneOfSchema,
  AllOfSchema,
]);
