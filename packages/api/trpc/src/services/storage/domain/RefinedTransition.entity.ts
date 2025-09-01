import { RefinedConstraintSchema } from "./RefinedConstraint.entity";
import { RefinedEffectSchema } from "./RefinedEffect.entity";
import { z } from "zod";

export type RefinedTransition = z.infer<typeof RefinedTransitionSchema>;
export const RefinedTransitionSchema = z.object({
  effect: RefinedEffectSchema,
  constraints: z.array(RefinedConstraintSchema),
});
