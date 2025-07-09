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
import type { DFSOptions, PathResult } from "../types";

/**
 * Find any path to target using true DFS (memory efficient)
 */
export async function findAnyPath(
  getState: (index: LexicalIndex) => InternalSystemState | undefined,
  encodeState: (state: InternalSystemState) => number,
  positionHandlers: Record<PositionType, PositionHandler>,
  origin: LexicalIndex,
  options: DFSOptions & { target: LexicalIndex }
): Promise<PathResult> {
  const startTime = performance.now();
  const {
    target,
    depthLimit = 50,
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

  const visited = new Set<LexicalIndex>();
  let visitedCount = 0;

  async function dfsRecursive(
    currentIndex: LexicalIndex,
    path: StateTransition[],
    depth: number
  ): Promise<PathResult | null> {
    // Check time limit
    if (performance.now() - startTime > timeLimit) {
      return null;
    }

    // Check depth limit
    if (depth >= depthLimit) return null;

    // Check visit limit
    if (visitedCount >= visitLimit) return null;

    if (visited.has(currentIndex)) return null;
    visited.add(currentIndex);
    visitedCount++;

    const currentState = getState(currentIndex);
    if (!currentState) return null;

    // Use depth-first transition generator for true DFS behavior
    const transitionGenerator = transitionEngines.depthFirst(
      currentState,
      encodeState,
      positionHandlers
    );

    for (const transition of transitionGenerator) {
      const nextIndex = transition.lexicalIndex;

      if (nextIndex === target) {
        return {
          found: true,
          path: [...path, transition],
          steps: depth + 1,
          target,
          visitedStates: visitedCount,
          searchTimeMs: performance.now() - startTime,
        };
      }

      if (!visited.has(nextIndex)) {
        const result = await dfsRecursive(
          nextIndex,
          [...path, transition],
          depth + 1
        );
        if (result) return result;
      }
    }

    return null;
  }

  const result = await dfsRecursive(origin, [], 0);

  return (
    result || {
      found: false,
      path: [],
      steps: 0,
      visitedStates: visitedCount,
      searchTimeMs: performance.now() - startTime,
    }
  );
}
