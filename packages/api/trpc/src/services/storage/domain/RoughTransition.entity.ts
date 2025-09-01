import z from "zod";

export type RoughTransition = z.infer<typeof RoughTransitionSchema>;
export const RoughTransitionSchema = z.object({
  effect: z
    .string()
    .describe(
      "How will the properties of the entities in the system change in response to this transition? " +
        "Only entities which are present in the system may be modified, " +
        "and the data type of an entity's property must match the data type of the value being set."
    ),
  constraints: z
    .array(z.string())
    .describe(
      "What must be true about the current state of the entities in the system in order for this transition to be allowed?"
    ),
});
