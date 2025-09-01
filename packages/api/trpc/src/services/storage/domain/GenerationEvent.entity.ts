import { z } from "zod";
import { ArtifactSchema } from "./Artifact.entity";
import { RefinedStateSpaceSchema } from "./RefinedStateSpace.entity";

export type ProcessMetadata = z.infer<typeof ProcessMetadataSchema>;
export const ProcessMetadataSchema = z
  .object({
    retryAttempts: z.number(),
    error: z.string().optional(),
  })
  .optional();

export type GenerateStatespaceInput = z.infer<
  typeof GenerateStatespaceInputSchema
>;
export const GenerateStatespaceInputSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  processName: z.string().optional(),
});

export type GenerationSuccess = z.infer<typeof GenerationSuccessSchema>;
export const GenerationSuccessSchema = z.object({
  success: z.literal(true),
  stateSpace: RefinedStateSpaceSchema,
});

export type GenerationFailure = z.infer<typeof GenerationFailureSchema>;
export const GenerationFailureSchema = z.object({
  success: z.literal(false),
  reason: z.string(),
});

export type GenerationEvent = z.infer<typeof GenerationEventSchema>;
export const GenerationEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("process_created"),
    processId: z.string().uuid(),
    processName: z.string(),
    originalPrompt: z.string(),
    createdAt: z.string(),
    metadata: ProcessMetadataSchema,
  }),
  z.object({
    type: z.literal("started"),
    processId: z.string().uuid(),
    step: z.number(),
    stepName: z.string(),
    metadata: ProcessMetadataSchema,
  }),
  z.object({
    type: z.literal("progress"),
    processId: z.string().uuid(),
    step: z.number(),
    stepName: z.string(),
    artifact: ArtifactSchema.optional(),
    metadata: ProcessMetadataSchema,
  }),
  z.object({
    type: z.literal("completed"),
    processId: z.string().uuid(),
    result: z.discriminatedUnion("success", [
      GenerationSuccessSchema,
      GenerationFailureSchema,
    ]),
    metadata: ProcessMetadataSchema,
  }),
  z.object({
    type: z.literal("error"),
    processId: z.string().uuid(),
    error: z.string(),
    metadata: ProcessMetadataSchema,
  }),
]);
