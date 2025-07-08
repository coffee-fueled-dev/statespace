import type { Explorer, LexicalIndex } from "@statespace/core";

export interface BreadthLimitedReachabilityResult {
  statesByStep: Map<number, Set<LexicalIndex>>;
  totalReachableStates: number;
  searchTimeMs: number;
}

/**
 * Find all states reachable within X steps from an origin state
 */
export async function breadthLimitedReachability(
  explorer: Explorer,
  origin: LexicalIndex,
  maxSteps: number,
  silent: boolean = false
): Promise<BreadthLimitedReachabilityResult> {
  const startTime = performance.now();

  if (!silent) {
    console.log(
      `🔍 Finding all states reachable within ${maxSteps} steps from state ${origin}`
    );
  }

  const statesByStep = new Map<number, Set<LexicalIndex>>();
  const visited = new Set<LexicalIndex>();

  // Initialize with origin state at step 0
  statesByStep.set(0, new Set([origin]));
  visited.add(origin);

  for (let step = 0; step < maxSteps; step++) {
    const currentStepStates = statesByStep.get(step);
    if (!currentStepStates || currentStepStates.size === 0) break;

    const nextStepStates = new Set<LexicalIndex>();

    for (const stateIndex of currentStepStates) {
      const result = explorer.singleState(stateIndex);
      if (result) {
        for (const transition of result.possibleTransitions) {
          if (!visited.has(transition.lexicalIndex)) {
            visited.add(transition.lexicalIndex);
            nextStepStates.add(transition.lexicalIndex);
          }
        }
      }
    }

    if (nextStepStates.size > 0) {
      statesByStep.set(step + 1, nextStepStates);
    }
  }

  const searchTimeMs = performance.now() - startTime;

  if (!silent) {
    console.log(
      `✅ Found ${visited.size} total reachable states within ${maxSteps} steps`
    );
    for (const [step, states] of statesByStep) {
      console.log(`   Step ${step}: ${states.size} states`);
    }
    console.log(`⏱️  Search completed in ${searchTimeMs.toFixed(2)}ms`);
  }

  return {
    statesByStep,
    totalReachableStates: visited.size,
    searchTimeMs,
  };
}
