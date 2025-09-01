import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type {
  AppRouter,
  GenerationEvent,
  GenerationFailure,
  GenerationSuccess,
} from "@statespace/trpc";
import { z } from "zod";

// Create tRPC client
const createTRPCStatespaceClient = (
  serverUrl: string = "http://localhost:3000"
) => {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${serverUrl}/trpc`,
      }),
    ],
  });
};

export const generateStatespaceInputSchema = z.object({
  prompt: z
    .string()
    .min(1)
    .describe("The prompt describing the system to model"),
  processName: z
    .string()
    .optional()
    .describe("Optional name for this generation process"),
  serverUrl: z
    .string()
    .url()
    .optional()
    .default("http://localhost:3000")
    .describe("tRPC server URL"),
});

export type GenerateStatespaceInput = z.infer<
  typeof generateStatespaceInputSchema
>;

export async function generateStatespace(input: GenerateStatespaceInput) {
  const { prompt, processName, serverUrl = "http://localhost:3000" } = input;

  console.log(`🚀 Starting statespace generation via tRPC...`);
  console.log(`📡 Connecting to tRPC server at: ${serverUrl}`);
  console.log(`📝 Prompt: ${prompt}`);

  const client = createTRPCStatespaceClient(serverUrl);

  const events: GenerationEvent[] = [];
  let finalResult: GenerationSuccess | GenerationFailure | null = null;

  try {
    // Create a promise that resolves when the subscription completes
    await new Promise<void>((resolve, reject) => {
      const subscription = client.generation.generate.subscribe(
        {
          prompt,
          processName,
        },
        {
          onStarted(_opts) {
            console.log("▶️ Generation started...");
          },
          onData(value) {
            events.push(value);
            console.log(`📊 Event: ${value.type}`);

            // Handle different event types
            switch (value.type) {
              case "process_created":
                console.log(`🆔 Process ID: ${value.processId}`);
                console.log(`📛 Process Name: ${value.processName}`);
                break;
              case "started":
                console.log(`▶️ Started: ${value.stepName}`);
                break;
              case "progress":
                console.log(
                  `⚡ Progress: Step ${value.step} - ${value.stepName}`
                );
                if (value.artifact) {
                  console.log(`📦 Artifact: ${value.artifact.type}`);
                }
                break;
              case "completed":
                console.log(`✅ Generation completed successfully!`);
                finalResult = value.result;
                resolve();
                break;
              case "error":
                console.log(`❌ Error: ${value.error}`);
                reject(new Error(`Generation failed: ${value.error}`));
                break;
            }
          },
          onError(err) {
            console.error("💥 tRPC subscription failed:", err);
            reject(new Error(`Subscription failed: ${err.message}`));
          },
          onComplete() {
            console.log("🏁 Subscription completed");
            if (!finalResult) {
              reject(
                new Error(
                  "Generation completed but no final state space was produced"
                )
              );
            } else {
              resolve();
            }
          },
        }
      );
    });
    const result = {
      success: true,
      stateSpace: finalResult,
      processId: events.find((e) => e.type === "process_created")?.processId,
      events: events,
      summary: {
        totalSteps: events.filter((e) => e.type === "progress").length,
        artifacts: events
          .filter(
            (e): e is Extract<GenerationEvent, { type: "progress" }> =>
              e.type === "progress" && e.artifact !== undefined
          )
          .map((e) => ({
            step: e.step,
            stepName: e.stepName,
            artifactType: e.artifact!.type,
          })),
      },
    };

    return JSON.stringify(result, null, 2);
  } catch (error) {
    console.error("💥 tRPC generation failed:", error);

    const errorResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      events: events,
      processId: events.find((e) => e.type === "process_created")?.processId,
    };

    return JSON.stringify(errorResult, null, 2);
  }
}
