import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { generateStatespaceStream } from "../services/generation/workflow";
import {
  GenerateStatespaceInputSchema,
  GenerationEventSchema,
} from "../services/storage/domain/GenerationEvent.entity";

export const generationRouter = router({
  // Generate statespace with real-time progress
  generate: publicProcedure
    .input(GenerateStatespaceInputSchema)
    .subscription(async function* ({
      input,
    }: {
      input: z.infer<typeof GenerateStatespaceInputSchema>;
    }) {
      for await (const event of generateStatespaceStream(input.prompt, {
        processName: input.processName || "tRPC Generation",
        saveArtifacts: true,
      })) {
        yield GenerationEventSchema.parse(event);
      }
    }),
});
