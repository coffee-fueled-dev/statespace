import type { StudyConfig, StudyResult } from "../explorer";

export interface DFSConfig<T extends object> extends StudyConfig<T> {}

/**
 * DFS implementation that follows one path deeply before backtracking.
 */
export async function dfs<T extends object>(_config: DFSConfig<T>): Promise<StudyResult<T>> {
  throw new Error("DFS is not implemented");
}
