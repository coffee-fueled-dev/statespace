import type { StudyConfig } from "./types";

export interface ExpandToLimitConfig<T extends object> extends StudyConfig<T> {
  // No additional config needed - everything is in StudyConfig
}

/**
 * Recursively expands the state graph from an initial state using BFS
 * Returns statistics about the exploration process
 */
export async function expandToLimit<T extends object>({
  explorer,
  initialState,
  limit: { maxIterations, maxStates },
}: ExpandToLimitConfig<T>): Promise<{
  statesExplored: number;
  iterationsPerformed: number;
  limitReached: "maxIterations" | "maxStates" | "completed";
}> {
  const explorationQueue: T[] = [initialState];
  const visitedHashes = new Set<string>();

  let iterationsPerformed = 0;
  let statesExplored = 0;

  // Add initial state to visited
  const initialHash = await explorer.encode(initialState);
  visitedHashes.add(initialHash);
  statesExplored++;

  while (explorationQueue.length > 0) {
    // Check limits
    iterationsPerformed++;
    if (iterationsPerformed >= maxIterations) {
      console.log(
        `Expansion stopped: reached max iterations (${maxIterations})`
      );
      return {
        statesExplored,
        iterationsPerformed,
        limitReached: "maxIterations",
      };
    }

    if (statesExplored >= maxStates) {
      console.log(`Expansion stopped: reached max states (${maxStates})`);
      return {
        statesExplored,
        iterationsPerformed,
        limitReached: "maxStates",
      };
    }

    // Get current state to explore
    const currentState = explorationQueue.shift()!;

    // Explore all neighbors using the iterator for fine-grained control
    for await (const neighbor of explorer.neighborIterator(currentState)) {
      const neighborHash = await explorer.encode(neighbor);

      // Only add if we haven't seen this state before
      if (!visitedHashes.has(neighborHash)) {
        visitedHashes.add(neighborHash);
        explorationQueue.push(neighbor);
        statesExplored++;

        // Check state limit after each new state
        if (statesExplored >= maxStates) {
          console.log(`Expansion stopped: reached max states (${maxStates})`);
          return {
            statesExplored,
            iterationsPerformed,
            limitReached: "maxStates",
          };
        }
      }
    }
  }

  console.log(
    `Expansion completed: explored ${statesExplored} states in ${iterationsPerformed} iterations`
  );
  return {
    statesExplored,
    iterationsPerformed,
    limitReached: "completed",
  };
}

/**
 * Example usage with Explorer.runStudy:
 *
 * ```typescript
 * const explorer = new Explorer(stateSpace, codex);
 *
 * const result = await explorer.runStudy(expandToLimit, {
 *   initialState: startState,
 *   limit: { maxIterations: 1000, maxStates: 5000 }
 * });
 *
 * console.log(`Explored ${result.statesExplored} states`);
 * console.log(`Performed ${result.iterationsPerformed} iterations`);
 * console.log(`Stopped due to: ${result.limitReached}`);
 * ```
 */
