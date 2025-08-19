// =============================================================================
// TOWER OF HANOI STATE SPACE EXPLORER
// =============================================================================

import { createClient, createStateModule } from "@statespace/memgraph";
import {
  TowerOfHanoiStateSchema,
  TowerOfHanoiTransitionRules,
  type TowerOfHanoiState,
} from "./config";
import {
  expandRecursive,
  jsonCodex,
  type TransitionEvent,
} from "@statespace/core";

const statespace = createClient({
  endpoint: "http://localhost:4000/graphql",
});
const stateModule = createStateModule(statespace);

console.log("=== Tower of Hanoi State Space Explorer ===");

// Function to explore state space for different numbers of disks
async function exploreHanoi(numberOfDisks: number) {
  console.log(`\n🔍 Exploring ${numberOfDisks}-disk Tower of Hanoi...`);

  // Set the initial state: all disks are on peg A
  const initialState: TowerOfHanoiState = {
    pegA: Array.from({ length: numberOfDisks }, (_, i) => numberOfDisks - i),
    pegB: [],
    pegC: [],
  };

  console.log("Initial State:", initialState);

  const queue: TransitionEvent<typeof TowerOfHanoiStateSchema.def.shape>[] = [];

  await expandRecursive({
    systemSchema: TowerOfHanoiStateSchema,
    initialState,
    transitionRules: TowerOfHanoiTransitionRules,
    codex: jsonCodex<TowerOfHanoiState>(),
    limit: {
      maxIterations: 1000,
      maxStates: 500,
    },
    async onTransition(event) {
      queue.push(event);
      await stateModule.create({
        input: {
          hash: event.fromState.hash,
          codex: jsonCodex<TowerOfHanoiState>().key,
          states_next: {
            create: [
              {
                edge: {
                  cost: event.cost,
                  rule_name: event.ruleName,
                  metadata: event.metadata
                    ? JSON.stringify(event.metadata)
                    : undefined,
                },
                node: {
                  hash: event.toState.hash,
                  codex: jsonCodex<TowerOfHanoiState>().key,
                },
              },
            ],
          },
        },
      });
      queue.push(event);
    },
  });
}
