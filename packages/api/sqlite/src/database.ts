import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";

export interface StatespaceProcess {
  id: string;
  name: string;
  original_prompt: string;
  status: "running" | "completed" | "failed";
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface ProcessArtifact {
  id: string;
  process_id: string;
  step_number: number;
  step_name: string;
  artifact_type:
    | "entities"
    | "transitions"
    | "json_schema"
    | "refined_transitions"
    | "final_statespace";
  data: any;
  metadata?: any; // Additional info like retry attempts, errors, etc.
  created_at: string;
}

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

    // Create main process table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS statespace_processes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        original_prompt TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        error_message TEXT
      )
    `);

    // Create artifacts table to store step-by-step results
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS process_artifacts (
        id TEXT PRIMARY KEY,
        process_id TEXT NOT NULL,
        step_number INTEGER NOT NULL,
        step_name TEXT NOT NULL,
        artifact_type TEXT NOT NULL CHECK(artifact_type IN (
          'entities', 'transitions', 'json_schema', 'refined_transitions', 'final_statespace'
        )),
        data JSON NOT NULL,
        metadata JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(process_id) REFERENCES statespace_processes(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for efficient queries
    this.db.exec(
      "CREATE INDEX IF NOT EXISTS idx_processes_status ON statespace_processes(status)"
    );
    this.db.exec(
      "CREATE INDEX IF NOT EXISTS idx_processes_created ON statespace_processes(created_at)"
    );
    this.db.exec(
      "CREATE INDEX IF NOT EXISTS idx_artifacts_process ON process_artifacts(process_id)"
    );
    this.db.exec(
      "CREATE INDEX IF NOT EXISTS idx_artifacts_step ON process_artifacts(process_id, step_number)"
    );
    this.db.exec(
      "CREATE INDEX IF NOT EXISTS idx_artifacts_type ON process_artifacts(artifact_type)"
    );
  }

  // Start a new statespace generation process
  createProcess(name: string, originalPrompt: string): string {
    const id = crypto.randomUUID();

    const stmt = this.db.prepare(`
      INSERT INTO statespace_processes (id, name, original_prompt, status)
      VALUES (?, ?, ?, 'running')
    `);

    stmt.run(id, name, originalPrompt);
    return id;
  }

  // Store artifact from a specific step
  storeArtifact(
    processId: string,
    stepNumber: number,
    stepName: string,
    artifactType: ProcessArtifact["artifact_type"],
    data: any,
    metadata?: any
  ): string {
    const id = crypto.randomUUID();

    const stmt = this.db.prepare(`
      INSERT INTO process_artifacts (id, process_id, step_number, step_name, artifact_type, data, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      processId,
      stepNumber,
      stepName,
      artifactType,
      JSON.stringify(data),
      metadata ? JSON.stringify(metadata) : null
    );

    return id;
  }

  // Mark process as completed
  completeProcess(processId: string): void {
    const stmt = this.db.prepare(`
      UPDATE statespace_processes 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(processId);
  }

  // Mark process as failed
  failProcess(processId: string, errorMessage: string): void {
    const stmt = this.db.prepare(`
      UPDATE statespace_processes 
      SET status = 'failed', completed_at = CURRENT_TIMESTAMP, error_message = ?
      WHERE id = ?
    `);

    stmt.run(errorMessage, processId);
  }

  // Get process with all its artifacts
  getProcessWithArtifacts(processId: string): {
    process: StatespaceProcess | null;
    artifacts: ProcessArtifact[];
  } {
    const processStmt = this.db.prepare(`
      SELECT * FROM statespace_processes WHERE id = ?
    `);

    const artifactsStmt = this.db.prepare(`
      SELECT * FROM process_artifacts 
      WHERE process_id = ? 
      ORDER BY step_number ASC, created_at ASC
    `);

    const process = processStmt.get(processId) as StatespaceProcess | null;
    const artifacts = artifactsStmt.all(processId) as ProcessArtifact[];

    // Parse JSON data
    artifacts.forEach((artifact) => {
      artifact.data = JSON.parse(artifact.data as any);
      if (artifact.metadata) {
        artifact.metadata = JSON.parse(artifact.metadata as any);
      }
    });

    return { process, artifacts };
  }

  // Get all processes with summary info
  getAllProcesses(): StatespaceProcess[] {
    const stmt = this.db.prepare(`
      SELECT * FROM statespace_processes 
      ORDER BY created_at DESC
    `);

    return stmt.all() as StatespaceProcess[];
  }

  // Get artifacts by type across all processes
  getArtifactsByType(
    artifactType: ProcessArtifact["artifact_type"]
  ): ProcessArtifact[] {
    const stmt = this.db.prepare(`
      SELECT pa.*, sp.name as process_name
      FROM process_artifacts pa
      JOIN statespace_processes sp ON pa.process_id = sp.id
      WHERE pa.artifact_type = ?
      ORDER BY pa.created_at DESC
    `);

    const artifacts = stmt.all(artifactType) as (ProcessArtifact & {
      process_name: string;
    })[];

    // Parse JSON data
    artifacts.forEach((artifact) => {
      artifact.data = JSON.parse(artifact.data as any);
      if (artifact.metadata) {
        artifact.metadata = JSON.parse(artifact.metadata as any);
      }
    });

    return artifacts;
  }

  // Search processes by name or prompt content
  searchProcesses(searchTerm: string): StatespaceProcess[] {
    const stmt = this.db.prepare(`
      SELECT * FROM statespace_processes 
      WHERE name LIKE ? OR original_prompt LIKE ?
      ORDER BY created_at DESC
    `);

    const term = `%${searchTerm}%`;
    return stmt.all(term, term) as StatespaceProcess[];
  }

  // Get process statistics
  getStatistics(): {
    total_processes: number;
    completed_processes: number;
    failed_processes: number;
    running_processes: number;
    total_artifacts: number;
  } {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total_processes,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_processes,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_processes,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running_processes,
        (SELECT COUNT(*) FROM process_artifacts) as total_artifacts
      FROM statespace_processes
    `);

    return stmt.get() as any;
  }

  // Close database connection
  close(): void {
    this.db.close();
  }
}

// Export singleton instance
export const statespaceStorage = new StatespaceStorage();
