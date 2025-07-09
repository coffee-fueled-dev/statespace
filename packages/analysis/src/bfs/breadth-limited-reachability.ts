import type { LexicalIndex, InternalSystemState } from "@statespace/core";
import type {
  PositionHandler,
  PositionType,
} from "@statespace/position-handlers";
import { transitionEngines } from "@statespace/core";
import type { BFSOptions, ReachabilityResult } from "../types";

/**
 * Find all reachable states within step limit using BFS
 */
export async function breadthLimitedReachability(
  getState: (index: LexicalIndex) => InternalSystemState | undefined,
  encodeState: (state: InternalSystemState) => number,
  positionHandlers: Record<PositionType, PositionHandler>,
  origin: LexicalIndex,
  options: BFSOptions = {}
): Promise<ReachabilityResult> {
  const startTime = performance.now();
  const { stepLimit = 10, visitLimit = Infinity, timeLimit = 30000 } = options;

  const reachableStates = new Set<LexicalIndex>([origin]);
  const queue: Array<{ index: LexicalIndex; steps: number }> = [
    { index: origin, steps: 0 },
  ];

  while (queue.length > 0) {
    // Check time limit
    if (performance.now() - startTime > timeLimit) {
      break;
    }

    const current = queue.shift()!;
    const { index, steps } = current;

    // Check step limit
    if (steps >= stepLimit) continue;

    // Check visit limit
    if (reachableStates.size >= visitLimit) break;

    const currentState = getState(index);
    if (!currentState) continue;

    // Use breadth-first transition generator
    const transitions = transitionEngines.breadthFirst(
      currentState,
      encodeState,
      positionHandlers
    );

    for (const transition of transitions) {
      const nextIndex = transition.lexicalIndex;

      if (!reachableStates.has(nextIndex)) {
        reachableStates.add(nextIndex);
        queue.push({ index: nextIndex, steps: steps + 1 });
      }
    }
  }

  return {
    reachableStates,
    visitedStates: reachableStates.size,
    searchTimeMs: performance.now() - startTime,
  };
}
