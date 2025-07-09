import type {
  LexicalIndex,
  StateTransition,
  InternalSystemState,
} from "@statespace/core";
import type {
  PositionHandler,
  PositionType,
} from "@statespace/position-handlers";
import { transitionEngines } from "@statespace/core";
import type { BFSOptions, PathResult } from "../types";

/**
 * Find any path to target within step limit using BFS
 */
export async function boundedPathSearch(
  getState: (index: LexicalIndex) => InternalSystemState | undefined,
  encodeState: (state: InternalSystemState) => number,
  positionHandlers: Record<PositionType, PositionHandler>,
  origin: LexicalIndex,
  options: BFSOptions & { target: LexicalIndex }
): Promise<PathResult> {
  const startTime = performance.now();
  const {
    target,
    stepLimit = 10,
    visitLimit = Infinity,
    timeLimit = 30000,
  } = options;

  if (origin === target) {
    return {
      found: true,
      path: [],
      steps: 0,
      target,
      visitedStates: 1,
      searchTimeMs: performance.now() - startTime,
    };
  }

  const visited = new Set<LexicalIndex>([origin]);
  const queue: Array<{
    index: LexicalIndex;
    path: StateTransition[];
    steps: number;
  }> = [{ index: origin, path: [], steps: 0 }];

  while (queue.length > 0) {
    // Check time limit
    if (performance.now() - startTime > timeLimit) {
      break;
    }

    const current = queue.shift()!;
    const { index, path, steps } = current;

    // Check step limit
    if (steps >= stepLimit) continue;

    // Check visit limit
    if (visited.size >= visitLimit) break;

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

      if (nextIndex === target) {
        return {
          found: true,
          path: [...path, transition],
          steps: steps + 1,
          target,
          visitedStates: visited.size,
          searchTimeMs: performance.now() - startTime,
        };
      }

      if (!visited.has(nextIndex)) {
        visited.add(nextIndex);
        queue.push({
          index: nextIndex,
          path: [...path, transition],
          steps: steps + 1,
        });
      }
    }
  }

  return {
    found: false,
    path: [],
    steps: 0,
    visitedStates: visited.size,
    searchTimeMs: performance.now() - startTime,
  };
}
