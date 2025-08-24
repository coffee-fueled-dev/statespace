import z from "zod/v4";
import { ConstraintSchema, ValidationSchema } from "./constraints/schema.zod";
import { EffectSchema } from "./effects/schema.zod";

export type StatespaceSystemDefinition = z.infer<
  typeof StatespaceSystemDefinitionSchema
>;
export const StatespaceSystemDefinitionSchema = z.object({
  schema: z
    .record(
      z.string(),
      z.union([ValidationSchema, z.record(z.string(), ValidationSchema)])
    )
    .describe("The properties of the system."),
  transitionRules: z
    .array(
      z.object({
        name: z.string().describe("The name of the transition rule."),
        constraints: z.array(ConstraintSchema),
        effects: z
          .array(EffectSchema)
          .describe(
            "Describe the proposed state of the system after the transition is applied. " +
              "You may define transforms that mutate the current state to produce some next state " +
              "or you may provide a completely new state. " +
              "If you provide a next state, it must be a complete state object that satisfies the schema. " +
              "If you define a definitive next state, that state will always be applied when the transition is applied."
          ),
        cost: z
          .nullable(z.number())
          .describe(
            "The cost of the transition. " +
              "This is a number that represents the cost of the transition. " +
              "The lower the cost, the more desirable the transition."
          ),
      })
    )
    .describe(
      "Define transition rules that model the system's behavior. " +
        "Constraints must resolve to true for a transition to be allowed. " +
        "Effects describe how the system will change as a result of the transition."
    ),
});
