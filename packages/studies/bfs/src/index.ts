import type { TransitionResult, TransitionSuccess } from "@statespace/core";
import type { StudyConfig, StudyResult } from "@statespace/explorer";
import {
  PriorityQueue,
  type ICompare,
} from "@datastructures-js/priority-queue";

export interface BFSConfig<T extends object> extends StudyConfig<T> {
  comparator?: ICompare<TransitionResult<T>>;
}

export interface BFSResult<T extends object> extends StudyResult<T> {
  reconstructPath?: (goalStateHash: string) => Promise<TransitionSuccess<T>[]>;
}

export async function bfs<T extends object>({
  explorer,
  initialState,
  exitConditions,
  comparator = (a, b) => (a.effect?.cost ?? 0) - (b.effect?.cost ?? 0),
}: BFSConfig<T>): Promise<BFSResult<T>> {
  explorer.resetState();

  const queue = new PriorityQueue<TransitionSuccess<T>>(comparator);
  const visited = new Set<string>();
  const parents = new Map<
    string,
    { parentHash: string; transition: TransitionSuccess<T> }
  >();

  const initialHash = await explorer.encode(initialState);
  visited.add(initialHash);

  const initialNeighbors = await explorer.neighbors(initialState);
  for (const neighbor of initialNeighbors) {
    if (neighbor.result.success) {
      queue.enqueue(neighbor.result);
      parents.set(neighbor.hash, {
        parentHash: initialHash,
        transition: neighbor.result,
      });
    }
  }

  const reconstructPath = async (
    goalStateHash: string
  ): Promise<TransitionSuccess<T>[]> => {
    const path: TransitionSuccess<T>[] = [];
    let currentHash = goalStateHash;

    while (parents.has(currentHash)) {
      const parent = parents.get(currentHash)!;
      path.unshift(parent.transition);
      currentHash = parent.parentHash;
    }

    return path;
  };

  let lastTransition: TransitionResult<T> | null = null;

  while (!queue.isEmpty()) {
    const current = queue.dequeue()!;
    lastTransition = current;

    // Check async or sync exit conditions
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
    if (visited.has(currentHash)) continue;
    visited.add(currentHash);

    const neighbors = await explorer.neighbors(current.state);
    for (const neighbor of neighbors) {
      const { result, hash } = neighbor;
      if (result.success && !visited.has(hash)) {
        queue.enqueue(result);
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
