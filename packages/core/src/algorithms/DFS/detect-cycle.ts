import type { System } from "../../schema.zod";
import type { Shape } from "../../schema";
import { generateDepthIterator } from "./any-path";
import type { StudyConfig } from "../BFS/optimal-path";

/**
 * Configuration for cycle detection DFS.
 */
export interface CycleDetectionConfig<TSystem extends System>
  extends StudyConfig<TSystem> {
  maxDepth?: number;
}

/**
 * True DFS-based cycle detection algorithm using recursion.
 * @returns The first cycle found (sequence of rule names) and total cost, or null if no cycle is found.
 */
export async function detectCycle<TSystem extends System>(
  config: CycleDetectionConfig<TSystem>
): Promise<{ cycle: string[]; cost: number } | null> {
  const {
    system,
    initialState,
    codex,
    maxDepth = 100, // Default reasonable limit for cycle detection
  } = config;

  // Map to track states in current path and their information
  const pathStates = new Map<string, { path: string[]; cost: number }>();

  // Recursive DFS helper function
  async function dfsForCycle(
    state: Shape<TSystem["schema"]>,
    path: string[],
    cost: number,
    depth: number
  ): Promise<{ cycle: string[]; cost: number } | null> {
    // Check if we've reached max depth
    if (depth >= maxDepth) {
      return null;
    }

    const stateHash = await codex.encode(state);

    // Check if we've found a cycle (state already in current path)
    if (pathStates.has(stateHash)) {
      const visitedInfo = pathStates.get(stateHash)!;
      // Found a cycle - return the cycle portion
      const cycleStart = visitedInfo.path.length;
      const cycle = path.slice(cycleStart);
      const cycleCost = cost - visitedInfo.cost;

      return { cycle, cost: cycleCost };
    }

    // Add current state to path
    pathStates.set(stateHash, { path: [...path], cost });

    try {
      // Generate transitions one at a time (true DFS behavior)
      const transitionIterator = generateDepthIterator(system, state);

      // Try each transition one at a time (true DFS behavior)
      for (const result of transitionIterator) {
        const childPath = [...path, result.ruleName];
        const childCost = cost + result.cost;

        // Recursively explore this path deeply
        const cycleResult = await dfsForCycle(
          result.systemState.shape,
          childPath,
          childCost,
          depth + 1
        );

        if (cycleResult) {
          return cycleResult; // Found cycle, return immediately
        }
        // If not found, continue to next transition (true lazy evaluation)
      }

      return null; // No cycle found from this state
    } finally {
      // Backtrack: remove from current path
      pathStates.delete(stateHash);
    }
  }

  // Start the recursive search
  const result = await dfsForCycle(initialState, [], 0, 0);

  if (result) {
    console.log("Cycle detected!");
    return result;
  } else {
    console.log("Search finished. No cycle found.");
    return null;
  }
}
