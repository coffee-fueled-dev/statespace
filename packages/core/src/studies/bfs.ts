import type { StudyConfig, StudyResult } from "../explorer";
import type { TransitionResult, TransitionSuccess } from "../transition/domain";

export interface BFSConfig<T extends object> extends StudyConfig<T> {}

export interface BFSResult<T extends object> extends StudyResult<T> {
  reconstructPath?: (goalStateHash: string) => Promise<TransitionSuccess<T>[]>;
}

/**
 * Unweighted breadth-first search (FIFO queue).
 * For cost-aware shortest paths, use `uniformCost`.
 */
export async function bfs<T extends object>({
  explorer,
  initialState,
  exitConditions,
  context,
}: BFSConfig<T>): Promise<BFSResult<T>> {
  explorer.resetState();

  const queue: TransitionSuccess<T>[] = [];
  let head = 0;
  const visited = new Set<string>();
  const parents = new Map<string, { parentHash: string; transition: TransitionSuccess<T> }>();

  const initialHash = await explorer.encode(initialState);
  visited.add(initialHash);

  const initialNeighbors = await explorer.neighbors(initialState, context);
  for (const neighbor of initialNeighbors) {
    if (neighbor.result.success && !visited.has(neighbor.hash)) {
      visited.add(neighbor.hash);
      queue.push(neighbor.result);
      parents.set(neighbor.hash, {
        parentHash: initialHash,
        transition: neighbor.result,
      });
    }
  }

  const reconstructPath = async (goalStateHash: string): Promise<TransitionSuccess<T>[]> => {
    const path: TransitionSuccess<T>[] = [];
    let currentHash = goalStateHash;

    while (parents.has(currentHash)) {
      const parent = parents.get(currentHash);
      if (!parent) break;
      path.unshift(parent.transition);
      currentHash = parent.parentHash;
    }

    return path;
  };

  let lastTransition: TransitionResult<T> | null = null;

  while (head < queue.length) {
    const current = queue[head++];
    if (!current) break;
    lastTransition = current;

    for (const exitCondition of exitConditions) {
      const maybeExit = exitCondition(explorer) as
        | StudyResult<T>
        | null
        | Promise<StudyResult<T> | null>;

      const exitResult = await Promise.resolve(maybeExit);
      if (exitResult) {
        return {
          ...exitResult,
          reconstructPath,
        };
      }
    }

    const currentHash = await explorer.encode(current.state);
    const neighbors = await explorer.neighbors(current.state, context);
    for (const neighbor of neighbors) {
      const { result, hash } = neighbor;
      if (result.success && !visited.has(hash)) {
        visited.add(hash);
        queue.push(result);
        parents.set(hash, { parentHash: currentHash, transition: result });
      }
    }
  }

  return {
    lastTransition: lastTransition,
    exitReason: "Search exhausted without meeting exit conditions",
    reconstructPath,
  };
}
