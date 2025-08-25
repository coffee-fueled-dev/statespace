import { SchemaSchema } from "./schema/schema.zod";
import { TransitionSchema, type Transition } from "./transitions/schema.zod";
import { z } from "zod";
import type { Schema } from "./schema";

export type System<TSchema extends Schema> = {
  schema: TSchema;
  transitionRules: Transition<TSchema>[];
};
export const SystemSchema = z.object({
  schema: SchemaSchema.describe("The properties of the system."),
  transitionRules: z
    .array(TransitionSchema)
    .describe(
      "Define transition rules that model the system's behavior. " +
        "Constraints must resolve to true for a transition to be allowed. " +
        "Effects describe how the system will change as a result of the transition."
    ),
});
