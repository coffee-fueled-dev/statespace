import z from "zod";
import { RoughEntitySchema } from "./RoughEntity.entity";
import { RoughTransitionSchema } from "./RoughTransition.entity";
import { RefinedTransitionSchema } from "./RefinedTransition.entity";
import { JSONSchemaMetaSchema } from "./JSONSchema.entity";
import { RefinedConstraintSchema } from "./RefinedConstraint.entity";
import { RefinedEffectSchema } from "./RefinedEffect.entity";
import { RefinedStateSpaceSchema } from "./RefinedStateSpace.entity";

export type Artifact = z.infer<typeof ArtifactSchema>;
export const ArtifactSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("RoughEntityList"),
    data: z.array(RoughEntitySchema),
  }),
  z.object({
    type: z.literal("RoughTransitionList"),
    data: z.array(RoughTransitionSchema),
  }),
  z.object({
    type: z.literal("RefinedShape"),
    data: JSONSchemaMetaSchema,
  }),
  z.object({
    type: z.literal("RefinedConstraintList"),
    data: z.array(RefinedConstraintSchema),
  }),
  z.object({
    type: z.literal("RefinedEffectList"),
    data: z.array(RefinedEffectSchema),
  }),
  z.object({
    type: z.literal("RefinedTransitionList"),
    data: z.array(RefinedTransitionSchema),
  }),
  z.object({
    type: z.literal("RefinedStateSpace"),
    data: RefinedStateSpaceSchema,
  }),
]);
