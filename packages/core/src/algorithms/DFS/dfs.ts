import z from "zod";
import type { System } from "../../types";
import type {
  TransitionRules,
  TransitionSuccess,
} from "../../transitions/types";
import type { Codex } from "../../codex";
import { applyTransition } from "../../transitions/apply-transition";

/**
 * Represents a single node in the DFS search graph.
 */
export interface DFSNode<TSystem> {
  state: TSystem;
  path: string[];
  cost: number;
}

/**
 * Configuration for the DFS algorithm.
 */
export interface DFSConfig<TSchema extends z.ZodRawShape> {
  systemSchema: z.ZodObject<TSchema>;
  initialState: System<TSchema>;
  transitionRules: TransitionRules<System<TSchema>>;
  targetCondition: (systemState: System<TSchema>) => boolean;
  codex: Codex<System<TSchema>>;
  /** Maximum depth to search */
  maxDepth?: number;
  /** Optional function to determine node priority for which neighbor to explore first */
  priorityFunction?: (node: DFSNode<System<TSchema>>) => number;
}

/**
 * True recursive DFS implementation that follows one path deeply before backtracking.
 * @returns The first path (sequence of rule names) and total cost, or null if no path is found.
 */
export async function DFS<TSchema extends z.ZodRawShape>(
  config: DFSConfig<TSchema>
): Promise<{ path: string[]; cost: number } | null> {
  const {
    systemSchema,
    initialState,
    transitionRules,
    targetCondition,
    codex,
    maxDepth = Infinity,
    priorityFunction,
  } = config;

  // Set to keep track of visited states in current path (for cycle detection)
  const visited = new Set<string>();

  // Recursive DFS helper function
  async function dfsRecursive(
    state: System<TSchema>,
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
      const transitionIterator = generateDepthIterator(
        systemSchema,
        state,
        transitionRules
      );

      // If priority function is provided, we need to collect and sort first
      if (priorityFunction) {
        const neighbors = Array.from(transitionIterator);
        neighbors.sort((a, b) => {
          const nodeA: DFSNode<System<TSchema>> = {
            state: a.systemState,
            path: [...path, a.ruleName],
            cost: cost + a.cost,
          };
          const nodeB: DFSNode<System<TSchema>> = {
            state: b.systemState,
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
            result.systemState,
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
            result.systemState,
            childPath,
            childCost,
            depth + 1
          );

          if (result_dfs) {
            return result_dfs; // Found target, return immediately
          }
          // If not found, continue to next transition (true lazy evaluation)
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
 * Generator function that yields one transition at a time (true depth-first behavior).
 * @param systemSchema The Zod schema for validation
 * @param currentState The current system state
 * @param transitionRules All available transition rules
 * @yields Transition outcomes one at a time (successful only)
 */
export function* generateDepthIterator<TSchema extends z.ZodRawShape>(
  systemSchema: z.ZodObject<TSchema>,
  currentState: System<TSchema>,
  transitionRules: TransitionRules<System<TSchema>>
): Generator<TransitionSuccess<System<TSchema>>, void, unknown> {
  for (const [ruleName, rule] of Object.entries(transitionRules)) {
    const outcome = applyTransition(systemSchema, currentState, ruleName, rule);

    if (outcome.success) {
      yield outcome;
    }
  }
}

/**
 * Legacy function for compatibility - generates all transitions at once.
 * Note: This is actually breadth-first generation and should be avoided in true DFS.
 * @deprecated Use generateDepthIterator for true DFS behavior
 */
export function generateDepth<TSchema extends z.ZodRawShape>(
  systemSchema: z.ZodObject<TSchema>,
  currentState: System<TSchema>,
  transitionRules: TransitionRules<System<TSchema>>
): TransitionSuccess<System<TSchema>>[] {
  return Array.from(
    generateDepthIterator(systemSchema, currentState, transitionRules)
  );
}
