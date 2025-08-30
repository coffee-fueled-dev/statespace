import type { PathfindingStudy, Node } from "./types";

/**
 * Configuration for the DFS algorithm.
 */
export interface AnyPathConfig<T extends object> extends PathfindingStudy<T> {
  maxDepth?: number;
}

/**
 * True recursive DFS implementation that follows one path deeply before backtracking.
 * @returns The first path (sequence of transition names) and total cost, or null if no path is found.
 */
export async function anyPath<T extends object>({
  explorer,
  initialState,
  targetCondition,
  maxDepth = Infinity,
  priorityFunction,
  limit,
}: AnyPathConfig<T>): Promise<{ path: string[]; cost: number } | null> {
  // Set to keep track of visited states in current path (for cycle detection)
  const visited = new Set<string>();
  let iterations = 0;

  // Recursive DFS helper function
  async function dfsRecursive(
    state: T,
    path: string[],
    cost: number,
    depth: number
  ): Promise<{ path: string[]; cost: number } | null> {
    // Check limits
    iterations++;
    if (iterations >= limit.maxIterations) {
      console.log(
        `Search stopped: reached max iterations (${limit.maxIterations})`
      );
      return null;
    }

    // Check if we've reached max depth
    if (depth >= maxDepth) {
      return null;
    }

    // Check if we've found the target
    if (targetCondition(state)) {
      return { path, cost };
    }

    const stateHash = await explorer.encode(state);

    // Skip if we've already visited this state in the current path (cycle detection)
    if (visited.has(stateHash)) {
      return null;
    }

    // Check max states limit using explorer's internal tracking
    if (explorer["states"].size >= limit.maxStates) {
      console.log(`Search stopped: reached max states (${limit.maxStates})`);
      return null;
    }

    // Mark as visited in current path
    visited.add(stateHash);

    try {
      // Get neighbors using the explorer's iterator for true DFS behavior
      const neighborIterator = explorer.neighborIterator(state);

      // If priority function is provided, we need to collect and sort first
      if (priorityFunction) {
        const neighbors: T[] = [];
        for await (const neighbor of neighborIterator) {
          neighbors.push(neighbor);
        }

        // Sort neighbors by priority
        neighbors.sort((a, b) => {
          const nodeA: Node<T> = {
            state: a,
            path: [...path, `transition_to_${neighbors.indexOf(a)}`],
            cost: cost + 1, // Default cost
          };
          const nodeB: Node<T> = {
            state: b,
            path: [...path, `transition_to_${neighbors.indexOf(b)}`],
            cost: cost + 1, // Default cost
          };
          return priorityFunction(nodeA) - priorityFunction(nodeB);
        });

        // Try each neighbor one at a time
        for (let i = 0; i < neighbors.length; i++) {
          const neighbor = neighbors[i];
          const transitionName = `transition_${i}`;
          const transitionCost = 1; // Default cost, could be configurable
          const childPath = [...path, transitionName];
          const childCost = cost + transitionCost;

          // Recursively explore this path deeply
          const result_dfs = await dfsRecursive(
            neighbor,
            childPath,
            childCost,
            depth + 1
          );

          if (result_dfs) {
            return result_dfs; // Found target, return immediately
          }
        }
      } else {
        // No priority function - use iterator directly for true depth-first
        let transitionIndex = 0;
        for await (const neighbor of neighborIterator) {
          const transitionName = `transition_${transitionIndex}`;
          const transitionCost = 1; // Default cost, could be configurable
          const childPath = [...path, transitionName];
          const childCost = cost + transitionCost;

          // Recursively explore this path deeply
          const result_dfs = await dfsRecursive(
            neighbor,
            childPath,
            childCost,
            depth + 1
          );

          if (result_dfs) {
            return result_dfs; // Found target, return immediately
          }

          transitionIndex++;
          // If not found, continue to next transition
        }
      }

      return null; // No path found from this state
    } finally {
      // Backtrack: remove from visited when we're done exploring this state
      visited.delete(stateHash);
    }
  }

  // Start the recursive search
  const result = await dfsRecursive(initialState, [], 0, 0);

  if (result) {
    console.log("Target state found!");
    return result;
  } else {
    console.log("Search finished. No path found.");
    return null;
  }
}
