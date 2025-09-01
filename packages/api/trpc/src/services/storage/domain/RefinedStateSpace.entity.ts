import z from "zod";
import { JSONSchemaMetaSchema } from "./JSONSchema.entity";
import { RefinedTransitionSchema } from "./RefinedTransition.entity";

export type RefinedStateSpace = z.infer<typeof RefinedStateSpaceSchema>;
export const RefinedStateSpaceSchema = z.object({
  shape: JSONSchemaMetaSchema,
  transitions: z.array(RefinedTransitionSchema),
});
