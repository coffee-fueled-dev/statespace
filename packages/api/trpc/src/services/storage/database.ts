import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";
import {
  GenerationEvent,
  GenerationEventSchema,
} from "./domain/GenerationEvent.entity";
import { Artifact } from "./domain/Artifact.entity";

export class StatespaceStorage {
  private db: Database;

  constructor(dbPath: string = "./data/statespaces.db") {
    this.db = new Database(dbPath);
    this.setupDatabase();
  }

  private async setupDatabase() {
    // Ensure data directory exists
    await mkdir("./data", { recursive: true });

    // Optimize for our workload
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA synchronous = NORMAL");
    this.db.exec("PRAGMA cache_size = -64000"); // 64MB cache
    this.db.exec("PRAGMA busy_timeout = 3000");

    // Create single events table - all GenerationEvents are stored here
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS generation_events (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        processId TEXT NOT NULL,
        type TEXT NOT NULL,
        data JSON NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for efficient queries
    this.db.exec(
      "CREATE INDEX IF NOT EXISTS idx_events_process ON generation_events(processId)"
    );
    this.db.exec(
      "CREATE INDEX IF NOT EXISTS idx_events_type ON generation_events(type)"
    );
    this.db.exec(
      "CREATE INDEX IF NOT EXISTS idx_events_created ON generation_events(createdAt)"
    );
  }

  // Store any generation event
  storeEvent(event: GenerationEvent): string {
    const id = crypto.randomUUID();

    // Validate event data before storing
    try {
      GenerationEventSchema.parse(event);
    } catch (error) {
      console.error(`Invalid event data: ${error}`);
      throw new Error(`Invalid event data: ${error}`);
    }

    const stmt = this.db.prepare(`
      INSERT INTO generation_events (id, processId, type, data)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, event.processId, event.type, JSON.stringify(event));

    return id;
  }

  // Get all events for a process
  getProcessEvents(processId: string): GenerationEvent[] {
    const stmt = this.db.prepare(`
      SELECT data FROM generation_events 
      WHERE processId = ? 
      ORDER BY createdAt ASC
    `);

    const rawEvents = stmt.all(processId);
    const events: GenerationEvent[] = [];

    for (const rawEvent of rawEvents) {
      try {
        const eventData = JSON.parse((rawEvent as any).data);
        const validatedEvent = GenerationEventSchema.parse(eventData);
        events.push(validatedEvent);
      } catch (error) {
        console.error("Failed to parse event:", error);
        // Continue with other events even if one fails
      }
    }

    return events;
  }

  // Derive process summary from events
  getProcessSummary(processId: string): {
    id: string;
    name: string;
    originalPrompt: string;
    status: "running" | "completed" | "failed";
    createdAt: string;
    completedAt?: string;
    errorMessage?: string;
    artifacts: Array<{
      stepNumber: number;
      stepName: string;
      artifact: Artifact;
      createdAt: string;
    }>;
  } | null {
    const events = this.getProcessEvents(processId);
    if (events.length === 0) return null;

    const processCreatedEvent = events.find(
      (e) => e.type === "process_created"
    );
    if (
      !processCreatedEvent ||
      processCreatedEvent.type !== "process_created"
    ) {
      return null;
    }

    const completedEvent = events.find((e) => e.type === "completed");
    const errorEvent = events.find((e) => e.type === "error");

    let status: "running" | "completed" | "failed" = "running";
    let completedAt: string | undefined;
    let errorMessage: string | undefined;

    if (completedEvent) {
      status = "completed";
      completedAt = new Date().toISOString(); // We could store timestamp in event
    } else if (errorEvent) {
      status = "failed";
      completedAt = new Date().toISOString();
      errorMessage = errorEvent.type === "error" ? errorEvent.error : undefined;
    }

    const artifacts = events
      .filter(
        (e): e is Extract<GenerationEvent, { type: "progress" }> =>
          e.type === "progress" && e.artifact !== undefined
      )
      .map((e) => ({
        stepNumber: e.step,
        stepName: e.stepName,
        artifact: e.artifact!,
        createdAt: new Date().toISOString(), // Could be stored in event
      }));

    return {
      id: processId,
      name: processCreatedEvent.processName,
      originalPrompt: processCreatedEvent.originalPrompt,
      status,
      createdAt: processCreatedEvent.createdAt,
      completedAt,
      errorMessage,
      artifacts,
    };
  }

  // Get all process summaries
  getAllProcessSummaries(): Array<{
    id: string;
    name: string;
    originalPrompt: string;
    status: "running" | "completed" | "failed";
    createdAt: string;
    completedAt?: string;
    errorMessage?: string;
  }> {
    // Get all unique process IDs
    const stmt = this.db.prepare(`
      SELECT DISTINCT processId FROM generation_events 
      ORDER BY MIN(createdAt) DESC
    `);

    const processIds = stmt.all() as Array<{ processId: string }>;

    return processIds
      .map(({ processId }) => {
        const summary = this.getProcessSummary(processId);
        if (!summary) return null;

        // Return summary without artifacts for list view
        const { artifacts, ...processSummary } = summary;
        return processSummary;
      })
      .filter(Boolean) as Array<{
      id: string;
      name: string;
      originalPrompt: string;
      status: "running" | "completed" | "failed";
      createdAt: string;
      completedAt?: string;
      errorMessage?: string;
    }>;
  }

  // Search processes by name or prompt content
  searchProcesses(searchTerm: string): Array<{
    id: string;
    name: string;
    originalPrompt: string;
    status: "running" | "completed" | "failed";
    createdAt: string;
    completedAt?: string;
    errorMessage?: string;
  }> {
    // Search in process_created events
    const stmt = this.db.prepare(`
      SELECT DISTINCT processId FROM generation_events 
      WHERE type = 'process_created' 
      AND (JSON_EXTRACT(data, '$.processName') LIKE ? OR JSON_EXTRACT(data, '$.originalPrompt') LIKE ?)
      ORDER BY createdAt DESC
    `);

    const term = `%${searchTerm}%`;
    const processIds = stmt.all(term, term) as Array<{ processId: string }>;

    return processIds
      .map(({ processId }) => {
        const summary = this.getProcessSummary(processId);
        if (!summary) return null;

        const { artifacts, ...processSummary } = summary;
        return processSummary;
      })
      .filter(Boolean) as Array<{
      id: string;
      name: string;
      originalPrompt: string;
      status: "running" | "completed" | "failed";
      createdAt: string;
      completedAt?: string;
      errorMessage?: string;
    }>;
  }

  // Get artifacts by step name across all processes
  getArtifactsByStep(stepName: string): Array<{
    processId: string;
    processName: string;
    stepNumber: number;
    stepName: string;
    artifact: Artifact;
    createdAt: string;
  }> {
    const stmt = this.db.prepare(`
      SELECT e1.processId, e1.data as progressData, e2.data as processData
      FROM generation_events e1
      JOIN generation_events e2 ON e1.processId = e2.processId AND e2.type = 'process_created'
      WHERE e1.type = 'progress' 
      AND JSON_EXTRACT(e1.data, '$.stepName') = ?
      AND JSON_EXTRACT(e1.data, '$.artifact') IS NOT NULL
      ORDER BY e1.createdAt DESC
    `);

    const results = stmt.all(stepName) as Array<{
      processId: string;
      progressData: string;
      processData: string;
    }>;

    return results
      .map(({ processId, progressData, processData }) => {
        try {
          const progressEvent = JSON.parse(progressData);
          const processEvent = JSON.parse(processData);

          if (progressEvent.artifact) {
            return {
              processId,
              processName: processEvent.processName,
              stepNumber: progressEvent.step,
              stepName: progressEvent.stepName,
              artifact: progressEvent.artifact,
              createdAt: new Date().toISOString(),
            };
          }
          return null;
        } catch (error) {
          console.error("Failed to parse artifact data:", error);
          return null;
        }
      })
      .filter(Boolean) as Array<{
      processId: string;
      processName: string;
      stepNumber: number;
      stepName: string;
      artifact: Artifact;
      createdAt: string;
    }>;
  }

  // Get basic statistics
  getStatistics(): {
    total_processes: number;
    completed_processes: number;
    failed_processes: number;
    running_processes: number;
    total_events: number;
  } {
    const allProcesses = this.getAllProcessSummaries();
    const totalEvents = this.db
      .prepare("SELECT COUNT(*) as count FROM generation_events")
      .get() as { count: number };

    return {
      total_processes: allProcesses.length,
      completed_processes: allProcesses.filter((p) => p.status === "completed")
        .length,
      failed_processes: allProcesses.filter((p) => p.status === "failed")
        .length,
      running_processes: allProcesses.filter((p) => p.status === "running")
        .length,
      total_events: totalEvents.count,
    };
  }

  // Close database connection
  close(): void {
    this.db.close();
  }
}

// Export singleton instance
export const statespaceStorage = new StatespaceStorage();

// Export entity types for use in other modules
export type { GenerationEvent } from "./domain/GenerationEvent.entity";
export type { Artifact } from "./domain/Artifact.entity";
