import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { statespaceStorage } from "../services/storage/database";

// Input schemas
const ProcessIdSchema = z.object({
  processId: z.string().uuid(),
});

const ListProcessesInput = z.object({
  status: z.enum(["running", "completed", "failed"]).optional(),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),
});

const SearchProcessesInput = z.object({
  searchTerm: z.string().min(1),
});

export const storageRouter = router({
  // Get process by ID with all artifacts and events
  getProcess: publicProcedure
    .input(ProcessIdSchema)
    .query(async ({ input }: { input: z.infer<typeof ProcessIdSchema> }) => {
      const summary = statespaceStorage.getProcessSummary(input.processId);
      if (!summary) {
        throw new Error(`Process ${input.processId} not found`);
      }
      const events = statespaceStorage.getProcessEvents(input.processId);
      return {
        process: summary,
        events,
        artifacts: summary.artifacts,
      };
    }),

  // List processes with basic filtering
  listProcesses: publicProcedure
    .input(ListProcessesInput)
    .query(async ({ input }: { input: z.infer<typeof ListProcessesInput> }) => {
      const allProcesses = statespaceStorage.getAllProcessSummaries();

      let filtered = allProcesses;
      if (input.status) {
        filtered = allProcesses.filter((p) => p.status === input.status);
      }

      return {
        processes: filtered.slice(input.offset, input.offset + input.limit),
        total: filtered.length,
        hasMore: input.offset + input.limit < filtered.length,
      };
    }),

  // Search processes by name or prompt
  searchProcesses: publicProcedure
    .input(SearchProcessesInput)
    .query(
      async ({ input }: { input: z.infer<typeof SearchProcessesInput> }) => {
        return statespaceStorage.searchProcesses(input.searchTerm);
      }
    ),

  // Delete a process and all its events
  deleteProcess: publicProcedure
    .input(ProcessIdSchema)
    .mutation(async ({ input }: { input: z.infer<typeof ProcessIdSchema> }) => {
      const process = statespaceStorage.getProcessSummary(input.processId);
      if (!process) {
        throw new Error(`Process ${input.processId} not found`);
      }

      // Store a deletion event to mark the process as deleted
      const deletionEvent = {
        type: "error" as const,
        processId: input.processId,
        error: "DELETED_BY_USER",
      };

      statespaceStorage.storeEvent(deletionEvent);

      return { success: true, processId: input.processId };
    }),

  // Get basic statistics
  getStatistics: publicProcedure.query(async () => {
    return statespaceStorage.getStatistics();
  }),

  // Get artifacts by step name (for debugging/analysis)
  getArtifactsByStep: publicProcedure
    .input(
      z.object({
        stepName: z.string(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(
      async ({
        input,
      }: {
        input: {
          stepName: string;
          limit: number;
        };
      }) => {
        const artifacts = statespaceStorage.getArtifactsByStep(input.stepName);
        return artifacts.slice(0, input.limit);
      }
    ),

  // Get all events for a process (for debugging)
  getProcessEvents: publicProcedure
    .input(ProcessIdSchema)
    .query(async ({ input }: { input: z.infer<typeof ProcessIdSchema> }) => {
      return statespaceStorage.getProcessEvents(input.processId);
    }),
});
