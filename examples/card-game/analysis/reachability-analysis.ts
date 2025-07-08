import { Explorer, type StateTransition } from "@statespace/core";
import { cardGameYamlEquivalentConfig } from "../typescript/config";

/**
 * Compute the lexical index for a specific initial state
 */
function computeInitialStateIndex(explorer: Explorer): number {
  // Start with a specific permutation: deck has first 5 cards, everything else empty
  const initialPermutation = [
    "ace",
    "king",
    "queen",
    "jack",
    "ten", // deck slots
    false,
    false,
    false, // hand slots (empty)
    false,
    false,
    false,
    false,
    false, // discard slots (empty)
  ];

  const codec = explorer.getCodec();
  return codec.encode(initialPermutation);
}

/**
 * Analyze what states are reachable after n transitions
 */
async function analyzeReachableStates(
  maxTransitions: number = 3
): Promise<void> {
  const explorer = new Explorer(
    cardGameYamlEquivalentConfig.elementBank,
    cardGameYamlEquivalentConfig.containers,
    { transitionEngine: cardGameYamlEquivalentConfig.transitionEngine }
  );

  const startIndex = computeInitialStateIndex(explorer);

  console.log(
    `🎯 Question: What states are reachable after ${maxTransitions} transitions?`
  );
  console.log(`🚀 Starting from state index: ${startIndex}\n`);

  // Track states by transition depth
  const statesByDepth = new Map<number, Set<number>>();
  const visited = new Set<number>();
  const queue: Array<{ index: number; depth: number }> = [
    { index: startIndex, depth: 0 },
  ];

  // BFS to find all reachable states
  while (queue.length > 0) {
    const { index, depth } = queue.shift()!;

    if (visited.has(index) || depth > maxTransitions) continue;
    visited.add(index);

    // Track this state at this depth
    if (!statesByDepth.has(depth)) {
      statesByDepth.set(depth, new Set());
    }
    statesByDepth.get(depth)!.add(index);

    // Explore all transitions from this state
    const result = explorer.singleState(index);
    if (result && depth < maxTransitions) {
      for (const transition of result.possibleTransitions) {
        queue.push({
          index: transition.lexicalIndex,
          depth: depth + 1,
        });
      }
    }
  }

  // Report results
  const LOG_LIMIT = 10;
  for (let depth = 0; depth <= maxTransitions; depth++) {
    const states = statesByDepth.get(depth);
    if (states) {
      console.log(
        `After ${depth} transition(s): ${states.size} reachable state(s)`
      );

      const examples = Array.from(states).slice(0, LOG_LIMIT);
      for (const stateIndex of examples) {
        const result = explorer.singleState(stateIndex);
        if (result) {
          console.log(`  State ${stateIndex}:`);
          result.currentState.containers.forEach((container) => {
            const items = container.slots.map((slot) =>
              slot === false ? "_" : slot
            );
            console.log(`    ${container.id}: [${items.join(", ")}]`);
          });
        }
      }
      if (states.size > LOG_LIMIT) {
        console.log(`    ... and ${states.size - LOG_LIMIT} more states`);
      }
      console.log();
    }
  }

  // Summary
  const totalReachable = visited.size;
  console.log(
    `📊 Summary: ${totalReachable} total unique states reachable within ${maxTransitions} transitions`
  );
}

async function main() {
  console.log("🎴 Card Game Reachability Analysis\n");

  console.log("📋 Configuration:");
  console.log(`  ${cardGameYamlEquivalentConfig.containers.length} containers`);
  console.log(
    `  ${cardGameYamlEquivalentConfig.elementBank.length} element slots total`
  );
  console.log();

  await analyzeReachableStates(3);
}

if (import.meta.main) {
  main().catch(console.error);
}
