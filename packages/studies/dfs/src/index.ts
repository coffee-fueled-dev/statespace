import type { StudyConfig, StudyResult } from "@statespace/core";

export interface DFSConfig<T extends object> extends StudyConfig<T> {}

/**
 * DFS implementation that follows one path deeply before backtracking.
 */
export async function dfs<T extends object>({
  explorer,
  initialState,
  exitConditions,
}: DFSConfig<T>): Promise<StudyResult<T>> {
  // DFS to find any path to an exit condition
}
