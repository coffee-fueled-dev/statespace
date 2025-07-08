import { Explorer, type StateTransition } from "@statespace/core";
import { cardGameYamlEquivalentConfig } from "../typescript/config";

interface SearchResult {
  found: boolean;
  path: StateTransition[];
  steps: number;
  targetIndex?: number;
}

/**
 * Compute the lexical index for a specific state permutation
 */
function computeStateIndex(
  explorer: Explorer,
  permutation: (string | boolean)[]
): number {
  const codec = explorer.getCodec();
  return codec.encode(permutation);
}

/**
 * Search for a path from origin state to target state within the step limit
 */
async function searchForGoal(
  originPermutation: (string | boolean)[],
  targetIndex: number,
  stepLimit: number = 10
): Promise<SearchResult> {
  const explorer = new Explorer(
    cardGameYamlEquivalentConfig.elementBank,
    cardGameYamlEquivalentConfig.containers,
    { transitionEngine: cardGameYamlEquivalentConfig.transitionEngine }
  );

  const originIndex = computeStateIndex(explorer, originPermutation);

  console.log(
    `🎯 Goal Search: Finding path from state ${originIndex} to state ${targetIndex}`
  );
  console.log(`📏 Step limit: ${stepLimit}\n`);

  // BFS with path tracking
  const visited = new Set<number>();
  const queue: Array<{
    index: number;
    path: StateTransition[];
    steps: number;
  }> = [{ index: originIndex, path: [], steps: 0 }];

  visited.add(originIndex);

  // Check if we're already at the target
  if (originIndex === targetIndex) {
    return { found: true, path: [], steps: 0, targetIndex };
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
        if (nextIndex === targetIndex) {
          return {
            found: true,
            path: newPath,
            steps: newSteps,
            targetIndex: nextIndex,
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

  return { found: false, path: [], steps: -1 };
}

/**
 * Display a state in a readable format
 */
function displayState(
  explorer: Explorer,
  stateIndex: number,
  label: string
): void {
  const result = explorer.singleState(stateIndex);
  if (result) {
    console.log(`${label} (${stateIndex}):`);
    result.currentState.containers.forEach((container) => {
      const items = container.slots.map((slot) =>
        slot === false ? "_" : slot
      );
      console.log(`  ${container.id}: [${items.join(", ")}]`);
    });
  }
}

/**
 * Example goal search scenarios
 */
async function runGoalSearchExamples(): Promise<void> {
  const explorer = new Explorer(
    cardGameYamlEquivalentConfig.elementBank,
    cardGameYamlEquivalentConfig.containers,
    { transitionEngine: cardGameYamlEquivalentConfig.transitionEngine }
  );

  console.log("🎴 Goal Search Analysis\n");

  // Start with a known state and see what transitions are actually available
  const startState = [
    "ace",
    "king",
    "queen",
    "jack",
    "ten", // deck: all cards
    false,
    false,
    false, // hand: empty
    false,
    false,
    false,
    false,
    false, // discard: empty
  ];

  const startIndex = computeStateIndex(explorer, startState);
  console.log(
    "🔍 Debugging: Let's see what transitions are actually available"
  );
  displayState(explorer, startIndex, "🚀 Starting state");

  const startResult = explorer.singleState(startIndex);
  if (startResult) {
    console.log("📋 Available transitions:");
    startResult.possibleTransitions.forEach((transition, index) => {
      console.log(
        `  ${index + 1}. ${transition.transitionType}: ${transition.element} (${
          transition.fromContainer
        } → ${transition.toContainer}) → state ${transition.lexicalIndex}`
      );
    });
    console.log();

    // Now let's use one of these actual transitions as our target
    if (startResult.possibleTransitions.length > 0) {
      const firstTransition = startResult.possibleTransitions[0];
      const firstTargetIndex = firstTransition.lexicalIndex;

      console.log("📋 Example 1: Use the first available transition as target");
      displayState(explorer, startIndex, "🚀 Origin state");
      displayState(
        explorer,
        firstTargetIndex,
        "🎯 Target state (first transition)"
      );
      console.log();

      const result1 = await searchForGoal(startState, firstTargetIndex, 3);

      if (result1.found) {
        console.log(`✅ Path found in ${result1.steps} steps!`);
        console.log("📝 Transition sequence:");
        result1.path.forEach((transition, index) => {
          console.log(
            `  ${index + 1}. ${transition.transitionType}: ${
              transition.element
            } (${transition.fromContainer} → ${transition.toContainer})`
          );
        });
      } else {
        console.log(`❌ No path found within 3 steps`);
      }

      console.log("\n" + "=".repeat(60) + "\n");

      // Example 2: Try a 2-step path
      if (startResult.possibleTransitions.length > 1) {
        const secondTransition = startResult.possibleTransitions[1];
        const secondTargetIndex = secondTransition.lexicalIndex;

        // Explore what transitions are available from the second target
        const secondResult = explorer.singleState(secondTargetIndex);
        if (secondResult && secondResult.possibleTransitions.length > 0) {
          const thirdTransition = secondResult.possibleTransitions[0];
          const thirdTargetIndex = thirdTransition.lexicalIndex;

          console.log("📋 Example 2: Two-step path via available transitions");
          displayState(explorer, startIndex, "🚀 Origin state");
          displayState(
            explorer,
            thirdTargetIndex,
            "🎯 Target state (2 steps away)"
          );
          console.log(
            `Expected path: ${firstTransition.element} → ${thirdTransition.element}`
          );
          console.log();

          const result2 = await searchForGoal(startState, thirdTargetIndex, 5);

          if (result2.found) {
            console.log(`✅ Path found in ${result2.steps} steps!`);
            console.log("📝 Transition sequence:");
            result2.path.forEach((transition, index) => {
              console.log(
                `  ${index + 1}. ${transition.transitionType}: ${
                  transition.element
                } (${transition.fromContainer} → ${transition.toContainer})`
              );
            });
          } else {
            console.log(`❌ No path found within 5 steps`);
          }
        }
      }
    }
  }

  console.log("\n" + "=".repeat(60) + "\n");

  // Example 3: Self-search (this should always work)
  console.log("📋 Example 3: Self-search (should be 0 steps)");
  displayState(explorer, startIndex, "🚀 Origin = Target state");
  console.log();

  const result3 = await searchForGoal(startState, startIndex, 1);

  if (result3.found) {
    console.log(`✅ Path found in ${result3.steps} steps!`);
    if (result3.steps === 0) {
      console.log("📝 No transitions needed - already at target!");
    }
  } else {
    console.log(`❌ No path found (this shouldn't happen for self-search)`);
  }
}

if (import.meta.main) {
  runGoalSearchExamples().catch(console.error);
}
