import { z } from "zod";

// Base scalar JSON Schema types
const StringSchema = z.object({
  type: z.literal("string"),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
  format: z.string().optional(),
});

const NumberSchema = z.object({
  type: z.literal("number"),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  multipleOf: z.number().optional(),
});

const IntegerSchema = z.object({
  type: z.literal("integer"),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  multipleOf: z.number().optional(),
});

const BooleanSchema = z.object({
  type: z.literal("boolean"),
});

const NullSchema = z.object({
  type: z.literal("null"),
});

// Define base shape for recursion
type BaseSerializableSchema =
  | z.infer<typeof StringSchema>
  | z.infer<typeof NumberSchema>
  | z.infer<typeof IntegerSchema>
  | z.infer<typeof BooleanSchema>
  | z.infer<typeof NullSchema>;

// Define recursive shape types
type ArraySerializableSchema = {
  type: "array";
  items: SerializableSchemaType;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
};

type ObjectSerializableSchema = {
  type: "object";
  properties?: Record<string, SerializableSchemaType>;
  required?: string[];
  additionalProperties?: boolean | SerializableSchemaType;
  minProperties?: number;
  maxProperties?: number;
};

type CompositionSerializableSchema =
  | { anyOf: SerializableSchemaType[] }
  | { oneOf: SerializableSchemaType[] }
  | { allOf: SerializableSchemaType[] };

export type SerializableSchemaType =
  | BaseSerializableSchema
  | ArraySerializableSchema
  | ObjectSerializableSchema
  | CompositionSerializableSchema;

// Create the recursive schemas using z.lazy
const ArraySchema: z.ZodType<ArraySerializableSchema> = z.lazy(() =>
  z.object({
    type: z.literal("array"),
    items: SerializableSchema,
    minItems: z.number().optional(),
    maxItems: z.number().optional(),
    uniqueItems: z.boolean().optional(),
  })
);

const ObjectSchema: z.ZodType<ObjectSerializableSchema> = z.lazy(() =>
  z.object({
    type: z.literal("object"),
    properties: z.record(z.string(), SerializableSchema).optional(),
    required: z.array(z.string()).optional(),
    additionalProperties: z.union([z.boolean(), SerializableSchema]).optional(),
    minProperties: z.number().optional(),
    maxProperties: z.number().optional(),
  })
);

const AnyOfSchema = z.lazy(() =>
  z.object({
    anyOf: z.array(SerializableSchema),
  })
);

const OneOfSchema = z.lazy(() =>
  z.object({
    oneOf: z.array(SerializableSchema),
  })
);

const AllOfSchema = z.lazy(() =>
  z.object({
    allOf: z.array(SerializableSchema),
  })
);

// Main SerializableSchema definition
export const SerializableSchema: z.ZodType<SerializableSchemaType> = z.union([
  StringSchema,
  NumberSchema,
  IntegerSchema,
  BooleanSchema,
  NullSchema,
  ArraySchema,
  ObjectSchema,
  AnyOfSchema,
  OneOfSchema,
  AllOfSchema,
]);

// Helper function to validate a shape schema
export const validateSerializableSchema = (
  schema: unknown
): schema is SerializableSchemaType => {
  return SerializableSchema.safeParse(schema).success;
};

// Example usage types for documentation
export type ObjectShapeExample = {
  type: "object";
  properties: {
    [key: string]: SerializableSchemaType;
  };
  required?: string[];
};

export type ArrayShapeExample = {
  type: "array";
  items: SerializableSchemaType;
};

export type ScalarShapeExample =
  | { type: "string" }
  | { type: "number" }
  | { type: "integer" }
  | { type: "boolean" }
  | { type: "null" };
