import { z } from "zod";

export type Scalar = z.infer<typeof ScalarSchema>;
export const ScalarSchema = z.union([z.string(), z.number(), z.boolean()]);

export type Serializable =
  | Scalar
  | Serializable[]
  | { [key: string]: Serializable };

export const SerializableSchema: z.ZodType<Serializable> = z.lazy(() =>
  z.union([
    ScalarSchema,
    z.array(SerializableSchema),
    z.record(z.string(), SerializableSchema),
  ])
);

export type Metadata = z.infer<typeof MetadataSchema>;
export const MetadataSchema = z.record(z.string(), SerializableSchema);
