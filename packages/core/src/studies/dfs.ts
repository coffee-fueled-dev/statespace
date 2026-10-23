import type { StudyConfig, StudyResult } from "../explorer";
import type { TransitionResult, TransitionSuccess } from "../transition/domain";

export interface DFSConfig<T extends object> extends StudyConfig<T> {}

export interface DFSResult<T extends object> extends StudyResult<T> {
  reconstructPath?: (goalStateHash: string) => Promise<TransitionSuccess<T>[]>;
}

/**
 * Unweighted depth-first search (LIFO stack).
 * Neighbors are pushed in reverse so the first neighbor from `explorer.neighbors`
 * is explored first. For layer-by-layer exploration, use `bfs`.
 */
export async function dfs<T extends object>({
  explorer,
  initialState,
  exitConditions,
  context,
}: DFSConfig<T>): Promise<DFSResult<T>> {
  explorer.resetState();

  const stack: TransitionSuccess<T>[] = [];
  const visited = new Set<string>();
  const parents = new Map<string, { parentHash: string; transition: TransitionSuccess<T> }>();

  const initialHash = await explorer.encode(initialState);
  visited.add(initialHash);

  const initialNeighbors = await explorer.neighbors(initialState, context);
  const initialToPush: TransitionSuccess<T>[] = [];
  for (const neighbor of initialNeighbors) {
    if (neighbor.result.success && !visited.has(neighbor.hash)) {
      visited.add(neighbor.hash);
      initialToPush.push(neighbor.result);
      parents.set(neighbor.hash, {
        parentHash: initialHash,
        transition: neighbor.result,
      });
    }
  }
  for (let i = initialToPush.length - 1; i >= 0; i--) {
    const next = initialToPush[i];
    if (next) stack.push(next);
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

  while (stack.length > 0) {
    const current = stack.pop();
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
    const toPush: TransitionSuccess<T>[] = [];
    for (const neighbor of neighbors) {
      const { result, hash } = neighbor;
      if (result.success && !visited.has(hash)) {
        visited.add(hash);
        toPush.push(result);
        parents.set(hash, { parentHash: currentHash, transition: result });
      }
    }
    for (let i = toPush.length - 1; i >= 0; i--) {
      const next = toPush[i];
      if (next) stack.push(next);
    }
  }

  return {
    lastTransition: lastTransition,
    exitReason: "Search exhausted without meeting exit conditions",
    reconstructPath,
  };
}
