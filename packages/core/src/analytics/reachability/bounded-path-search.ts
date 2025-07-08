import type { Explorer } from "../../explorer/index";
import type { StateTransition, LexicalIndex } from "../../types";

export interface BoundedPathSearchResult {
  found: boolean;
  path: StateTransition[];
  steps: number;
  target?: LexicalIndex;
  visitedStates: number;
  searchTimeMs: number;
}

export interface BoundedPathSearchOptions {
  stepLimit?: number;
  silent?: boolean;
}

/**
 * Search for a path from an origin state to a target state within a step limit
 */
export async function boundedPathSearch(
  explorer: Explorer,
  origin: LexicalIndex,
  target: LexicalIndex,
  options: BoundedPathSearchOptions = {}
): Promise<BoundedPathSearchResult> {
  const { stepLimit = 10, silent = false } = options;
  const startTime = performance.now();

  if (!silent) {
    console.log(
      `🎯 State Planner: Finding path from state ${origin} to state ${target}`
    );
    console.log(`📏 Step limit: ${stepLimit}\n`);
  }

  // BFS with path tracking
  const visited = new Set<LexicalIndex>();
  const queue: Array<{
    index: LexicalIndex;
    path: StateTransition[];
    steps: number;
  }> = [{ index: origin, path: [], steps: 0 }];

  visited.add(origin);

  // Check if we're already at the target
  if (origin === target) {
    const searchTimeMs = performance.now() - startTime;
    return {
      found: true,
      path: [],
      steps: 0,
      target,
      visitedStates: 1,
      searchTimeMs,
    };
  }

  while (queue.length > 0) {
    const { index, path, steps } = queue.shift()!;

    if (steps >= stepLimit) continue;

    const result = explorer.singleState(index);
    if (result) {
      // Explore all possible transitions
      for (const transition of result.possibleTransitions) {
        const nextIndex = transition.lexicalIndex;

        if (visited.has(nextIndex)) continue;
        visited.add(nextIndex);

        const newPath = [...path, transition];
        const newSteps = steps + 1;

        // Check if we've reached the target
        if (nextIndex === target) {
          const searchTimeMs = performance.now() - startTime;
          return {
            found: true,
            path: newPath,
            steps: newSteps,
            target: nextIndex,
            visitedStates: visited.size,
            searchTimeMs,
          };
        }

        // Continue searching if within step limit
        if (newSteps < stepLimit) {
          queue.push({
            index: nextIndex,
            path: newPath,
            steps: newSteps,
          });
        }
      }
    }
  }

  const searchTimeMs = performance.now() - startTime;
  return {
    found: false,
    path: [],
    steps: -1,
    visitedStates: visited.size,
    searchTimeMs,
  };
}

export function displayBoundedPathSearchResult(
  result: BoundedPathSearchResult,
  verbose: boolean = false
): void {
  if (result.found) {
    console.log(`✅ Path found in ${result.steps} steps!`);
    if (verbose) {
      console.log(`📊 Planner statistics:`);
      console.log(`   • Visited states: ${result.visitedStates}`);
      console.log(`   • Planner time: ${result.searchTimeMs.toFixed(2)}ms`);
    }
    if (result.path.length > 0) {
      console.log("📝 Transition sequence:");
      result.path.forEach((transition, index) => {
        console.log(
          `  ${index + 1}. ${transition.transitionType}: ${
            transition.element
          } (${transition.fromContainer} → ${transition.toContainer})`
        );
      });
    } else {
      console.log("📝 No transitions needed - already at target!");
    }
  } else {
    console.log(`❌ No path found within the step limit`);
    if (verbose) {
      console.log(`📊 Planner statistics:`);
      console.log(`   • Visited states: ${result.visitedStates}`);
      console.log(`   • Planner time: ${result.searchTimeMs.toFixed(2)}ms`);
    }
  }
}
