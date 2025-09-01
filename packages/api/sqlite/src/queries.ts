import { statespaceStorage } from "./database";

// Query utilities for common use cases

export class StatespaceQueries {
  // Get the most recent successful statespace generation
  static getLatestSuccessful() {
    const processes = statespaceStorage.getAllProcesses();
    const completed = processes.filter((p) => p.status === "completed");
    return completed.length > 0
      ? statespaceStorage.getProcessWithArtifacts(completed[0].id)
      : null;
  }

  // Get all failed processes with their error details
  static getFailedProcesses() {
    const processes = statespaceStorage.getAllProcesses();
    return processes.filter((p) => p.status === "failed");
  }

  // Get process performance metrics
  static getProcessMetrics(processId: string) {
    const { process, artifacts } =
      statespaceStorage.getProcessWithArtifacts(processId);
    if (!process) return null;

    const steps = artifacts.map((artifact) => ({
      step: artifact.step_number,
      name: artifact.step_name,
      duration:
        new Date(artifact.created_at).getTime() -
        new Date(process.created_at).getTime(),
      retries: artifact.metadata?.retries || 0,
      errors: artifact.metadata?.errors || [],
    }));

    return {
      processId,
      totalDuration: process.completed_at
        ? new Date(process.completed_at).getTime() -
          new Date(process.created_at).getTime()
        : null,
      steps,
      success: process.status === "completed",
    };
  }

  // Compare outputs between different processes
  static compareProcesses(processId1: string, processId2: string) {
    const process1 = statespaceStorage.getProcessWithArtifacts(processId1);
    const process2 = statespaceStorage.getProcessWithArtifacts(processId2);

    if (!process1.process || !process2.process) {
      throw new Error("One or both processes not found");
    }

    const comparison = {
      process1: {
        id: processId1,
        name: process1.process.name,
        prompt: process1.process.original_prompt,
        status: process1.process.status,
      },
      process2: {
        id: processId2,
        name: process2.process.name,
        prompt: process2.process.original_prompt,
        status: process2.process.status,
      },
      artifacts: {} as any,
    };

    // Compare artifacts by type
    const artifactTypes = [
      "entities",
      "transitions",
      "json_schema",
      "refined_transitions",
      "final_statespace",
    ];

    for (const type of artifactTypes) {
      const artifact1 = process1.artifacts.find(
        (a) => a.artifact_type === type
      );
      const artifact2 = process2.artifacts.find(
        (a) => a.artifact_type === type
      );

      comparison.artifacts[type] = {
        process1: artifact1?.data || null,
        process2: artifact2?.data || null,
        different:
          JSON.stringify(artifact1?.data) !== JSON.stringify(artifact2?.data),
      };
    }

    return comparison;
  }

  // Get evolution of a specific artifact type over time
  static getArtifactEvolution(
    artifactType:
      | "entities"
      | "transitions"
      | "json_schema"
      | "refined_transitions"
      | "final_statespace"
  ) {
    const artifacts = statespaceStorage.getArtifactsByType(artifactType);
    return artifacts.map((artifact) => ({
      processId: artifact.process_id,
      processName: (artifact as any).process_name,
      createdAt: artifact.created_at,
      data: artifact.data,
      metadata: artifact.metadata,
    }));
  }

  // Find processes with similar prompts
  static findSimilarPrompts(prompt: string, threshold: number = 0.7) {
    const processes = statespaceStorage.getAllProcesses();

    // Simple similarity based on common words
    const promptWords = prompt.toLowerCase().split(/\s+/);

    return processes
      .map((process) => {
        const processWords = process.original_prompt.toLowerCase().split(/\s+/);
        const commonWords = promptWords.filter((word) =>
          processWords.includes(word)
        );
        const similarity =
          commonWords.length /
          Math.max(promptWords.length, processWords.length);

        return { process, similarity };
      })
      .filter(({ similarity }) => similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);
  }

  // Export process data for analysis
  static exportProcess(processId: string) {
    const { process, artifacts } =
      statespaceStorage.getProcessWithArtifacts(processId);

    return {
      exportedAt: new Date().toISOString(),
      process,
      artifacts: artifacts.map((artifact) => ({
        ...artifact,
        data: artifact.data, // Already parsed
      })),
      metadata: {
        totalSteps: artifacts.length,
        artifactTypes: [...new Set(artifacts.map((a) => a.artifact_type))],
        completionStatus: process?.status,
      },
    };
  }

  // Get recent activity summary
  static getRecentActivity(days: number = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const processes = statespaceStorage.getAllProcesses();
    const recent = processes.filter((p) => new Date(p.created_at) >= cutoff);

    const stats = {
      totalProcesses: recent.length,
      completed: recent.filter((p) => p.status === "completed").length,
      failed: recent.filter((p) => p.status === "failed").length,
      running: recent.filter((p) => p.status === "running").length,
      averageCompletionTime: 0,
      mostCommonErrors: [] as string[],
    };

    // Calculate average completion time
    const completedProcesses = recent.filter(
      (p) => p.status === "completed" && p.completed_at
    );
    if (completedProcesses.length > 0) {
      const totalTime = completedProcesses.reduce((sum, p) => {
        return (
          sum +
          (new Date(p.completed_at!).getTime() -
            new Date(p.created_at).getTime())
        );
      }, 0);
      stats.averageCompletionTime = totalTime / completedProcesses.length;
    }

    // Get common error patterns
    const failedProcesses = recent.filter(
      (p) => p.status === "failed" && p.error_message
    );
    const errors = failedProcesses.map((p) => p.error_message!);
    const errorCounts = errors.reduce((acc, error) => {
      acc[error] = (acc[error] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    stats.mostCommonErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([error]) => error);

    return { stats, recentProcesses: recent };
  }
}

export { statespaceStorage };
