import type { LexicalIndex, InternalSystemState } from "@statespace/core";
import type {
  PositionHandler,
  PositionType,
} from "@statespace/position-handlers";
import type { BFSOptions, ReachabilityResult } from "../types";
import { recursiveGraphExpansion } from "./recursive-graph-expansion";

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

  const reachableStates = new Set<LexicalIndex>();

  // Use the new recursive graph expansion
  const expansion = recursiveGraphExpansion(
    getState,
    encodeState,
    positionHandlers,
    [origin], // Single origin as array
    {
      levels: stepLimit,
      visitLimit,
      timeLimit,
    }
  );

  // Collect all discovered states
  for await (const discoveredState of expansion) {
    reachableStates.add(discoveredState.index);
  }

  return {
    reachableStates,
    visitedStates: reachableStates.size,
    searchTimeMs: performance.now() - startTime,
  };
}
