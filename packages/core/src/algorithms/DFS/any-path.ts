import type { System } from "../../schema.zod";
import type { TransitionSuccess } from "../../transitions";
import type { Codex } from "../../codex";
import { applyTransition } from "../../transitions/apply-transition";
import type { ExecutableSystem } from "../../compile";
import type { Shape } from "../../schema";
import type { PathfindingStudy } from "../BFS/optimal-path";

/**
 * Represents a single node in the DFS search graph.
 */
export interface DFSNode<TSystem extends System> {
  state: Shape<TSystem["schema"]>;
  path: string[];
  cost: number;
}

/**
 * Configuration for the DFS algorithm.
 */
export interface AnyPathConfig<TSystem extends System>
  extends PathfindingStudy<TSystem> {
  maxDepth?: number;
}

/**
 * True recursive DFS implementation that follows one path deeply before backtracking.
 * @returns The first path (sequence of rule names) and total cost, or null if no path is found.
 */
export async function anyPath<TSystem extends System>({
  system,
  initialState,
  targetCondition,
  codex,
  maxDepth = Infinity,
  priorityFunction,
}: AnyPathConfig<TSystem>): Promise<{ path: string[]; cost: number } | null> {
  // Set to keep track of visited states in current path (for cycle detection)
  const visited = new Set<string>();

  // Recursive DFS helper function
  async function dfsRecursive(
    state: Shape<TSystem["schema"]>,
    path: string[],
    cost: number,
    depth: number
  ): Promise<{ path: string[]; cost: number } | null> {
    // Check if we've reached max depth
    if (depth >= maxDepth) {
      return null;
    }

    // Check if we've found the target
    if (targetCondition(state)) {
      return { path, cost };
    }

    const stateHash = await codex.encode(state);

    // Skip if we've already visited this state in the current path (cycle detection)
    if (visited.has(stateHash)) {
      return null;
    }

    // Mark as visited in current path
    visited.add(stateHash);

    try {
      // Generate transitions one at a time (true DFS behavior)
      const transitionIterator = generateDepthIterator(system, state);

      // If priority function is provided, we need to collect and sort first
      if (priorityFunction) {
        const neighbors = Array.from(transitionIterator);
        neighbors.sort((a, b) => {
          const nodeA: DFSNode<TSystem> = {
            state: a.systemState.shape,
            path: [...path, a.ruleName],
            cost: cost + a.cost,
          };
          const nodeB: DFSNode<TSystem> = {
            state: b.systemState.shape,
            path: [...path, b.ruleName],
            cost: cost + b.cost,
          };
          return priorityFunction(nodeB) - priorityFunction(nodeA);
        });

        // Try each neighbor one at a time
        for (const result of neighbors) {
          const childPath = [...path, result.ruleName];
          const childCost = cost + result.cost;

          // Recursively explore this path deeply
          const result_dfs = await dfsRecursive(
            result.systemState.shape,
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
        for (const result of transitionIterator) {
          const childPath = [...path, result.ruleName];
          const childCost = cost + result.cost;

          // Recursively explore this path deeply
          const result_dfs = await dfsRecursive(
            result.systemState.shape,
            childPath,
            childCost,
            depth + 1
          );

          if (result_dfs) {
            return result_dfs; // Found target, return immediately
          }
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

/**
 * Generator function that yields one transition at a time.
 * @yields TransitionSuccess
 */
export function* generateDepthIterator<TSystem extends System>(
  system: ExecutableSystem<TSystem>,
  currentState: Shape<TSystem["schema"]>
): Generator<TransitionSuccess<Shape<TSystem["schema"]>>, void, unknown> {
  for (const [ruleName, rule] of Object.entries(system.transitionRules)) {
    const outcome = applyTransition(
      system.schema,
      { shape: currentState },
      ruleName,
      rule
    );

    if (outcome.success) {
      yield outcome;
    }
  }
}
