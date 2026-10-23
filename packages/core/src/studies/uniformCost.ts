import { PriorityQueue } from "@datastructures-js/priority-queue";
import type { StudyConfig, StudyResult } from "../explorer";
import type { TransitionResult, TransitionSuccess } from "../transition/domain";

export interface UniformCostConfig<T extends object> extends StudyConfig<T> {}

export interface UniformCostResult<T extends object> extends StudyResult<T> {
  reconstructPath?: (goalStateHash: string) => Promise<TransitionSuccess<T>[]>;
}

type Queued<T extends object> = {
  result: TransitionSuccess<T>;
  /** Cumulative path cost g(n) from the initial state. */
  g: number;
  /** Insertion order among equal costs (FIFO tie-break). */
  seq: number;
};

function edgeCost<T extends object>(result: TransitionSuccess<T>): number {
  return result.effect?.cost ?? 0;
}

/**
 * Uniform-cost / Dijkstra search: PriorityQueue ordered by cumulative path
 * cost (sum of `effect.cost`; missing cost treated as 0). Equal costs dequeue
 * in enqueue order. Parent links update only when a cheaper path is found.
 *
 * For unweighted layer-by-layer exploration, use {@link bfs}.
 */
export async function uniformCost<T extends object>({
  explorer,
  initialState,
  exitConditions,
  context,
}: UniformCostConfig<T>): Promise<UniformCostResult<T>> {
  explorer.resetState();

  let seq = 0;
  const queue = new PriorityQueue<Queued<T>>((a, b) => {
    const costDelta = a.g - b.g;
    if (costDelta !== 0) return costDelta;
    return a.seq - b.seq;
  });
  const best = new Map<string, number>();
  const settled = new Set<string>();
  const parents = new Map<string, { parentHash: string; transition: TransitionSuccess<T> }>();

  const initialHash = await explorer.encode(initialState);
  best.set(initialHash, 0);
  settled.add(initialHash);

  const initialNeighbors = await explorer.neighbors(initialState, context);
  for (const neighbor of initialNeighbors) {
    if (!neighbor.result.success) continue;
    const g = edgeCost(neighbor.result);
    const prior = best.get(neighbor.hash);
    if (prior !== undefined && g >= prior) continue;
    best.set(neighbor.hash, g);
    parents.set(neighbor.hash, {
      parentHash: initialHash,
      transition: neighbor.result,
    });
    queue.enqueue({ result: neighbor.result, g, seq: seq++ });
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

  while (!queue.isEmpty()) {
    const queued = queue.dequeue();
    if (!queued) break;
    const current = queued.result;
    const currentHash = await explorer.encode(current.state);

    if (settled.has(currentHash)) continue;
    const known = best.get(currentHash);
    if (known !== undefined && queued.g > known) continue;
    settled.add(currentHash);
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

    const neighbors = await explorer.neighbors(current.state, context);
    for (const neighbor of neighbors) {
      const { result, hash } = neighbor;
      if (!result.success || settled.has(hash)) continue;
      const g = queued.g + edgeCost(result);
      const prior = best.get(hash);
      if (prior !== undefined && g >= prior) continue;
      best.set(hash, g);
      parents.set(hash, { parentHash: currentHash, transition: result });
      queue.enqueue({ result, g, seq: seq++ });
    }
  }

  return {
    lastTransition: lastTransition,
    exitReason: "Search exhausted without meeting exit conditions",
    reconstructPath,
  };
}
