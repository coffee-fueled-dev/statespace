import type { LexicalIndex, InternalSystemState } from "@statespace/core";
import type {
  PositionHandler,
  PositionType,
} from "@statespace/position-handlers";
import { transitionEngines } from "@statespace/core";
import type { DFSOptions, CycleResult } from "../types";

/**
 * Detect cycles in the state graph using true DFS
 */
export async function detectCycles(
  getState: (index: LexicalIndex) => InternalSystemState | undefined,
  encodeState: (state: InternalSystemState) => number,
  positionHandlers: Record<PositionType, PositionHandler>,
  origin: LexicalIndex,
  options: DFSOptions = {}
): Promise<CycleResult> {
  const startTime = performance.now();
  const { depthLimit = 50, visitLimit = Infinity, timeLimit = 30000 } = options;

  const visited = new Set<LexicalIndex>();
  const recursionStack = new Set<LexicalIndex>();
  const cycles: LexicalIndex[][] = [];
  let visitedCount = 0;

  async function dfsRecursive(
    currentIndex: LexicalIndex,
    path: LexicalIndex[]
  ): Promise<void> {
    // Check time limit
    if (performance.now() - startTime > timeLimit) {
      return;
    }

    // Check depth limit
    if (path.length >= depthLimit) return;

    // Check visit limit
    if (visitedCount >= visitLimit) return;

    if (recursionStack.has(currentIndex)) {
      // Found a cycle
      const cycleStart = path.indexOf(currentIndex);
      if (cycleStart !== -1) {
        cycles.push(path.slice(cycleStart));
      }
      return;
    }

    if (visited.has(currentIndex)) return;

    visited.add(currentIndex);
    recursionStack.add(currentIndex);
    visitedCount++;

    const currentState = getState(currentIndex);
    if (!currentState) return;

    // Use depth-first transition generator for true DFS behavior
    const transitionGenerator = transitionEngines.depthFirst(
      currentState,
      encodeState,
      positionHandlers
    );

    for (const transition of transitionGenerator) {
      const nextIndex = transition.lexicalIndex;
      await dfsRecursive(nextIndex, [...path, currentIndex]);
    }

    recursionStack.delete(currentIndex);
  }

  await dfsRecursive(origin, []);

  return {
    found: cycles.length > 0,
    cycles,
    visitedStates: visitedCount,
    searchTimeMs: performance.now() - startTime,
  };
}
