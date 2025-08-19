// =============================================================================
// TOWER OF HANOI STATE SPACE EXPLORER
// =============================================================================

import { createClient, createStateModule } from "@statespace/memgraph";
import { SystemStateSchema, transitionRules, type SystemState } from "./config";
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
  const initialState: SystemState = {
    pegA: Array.from({ length: numberOfDisks }, (_, i) => numberOfDisks - i),
    pegB: [],
    pegC: [],
  };

  console.log("Initial State:", initialState);

  const queue: TransitionEvent<typeof SystemStateSchema.def.shape>[] = [];

  await expandRecursive({
    systemSchema: SystemStateSchema,
    initialState,
    transitionRules,
    codex: jsonCodex<SystemState>(),
    limit: {
      maxIterations: 1000,
      maxStates: 500,
    },
    async onTransition(event) {
      queue.push(event);
    },
  });

  for (let index = 0; index < queue.length; index++) {
    const event = queue[index];

    const result = await stateModule.upsertBatch({
      input: [
        {
          hash: event.fromState.hash,
          codex: jsonCodex<SystemState>().key,
        },
        {
          hash: event.toState.hash,
          codex: jsonCodex<SystemState>().key,
        },
      ],
    });

    const { states } = result.upsertStates;

    await stateModule.createTransition({
      input: {
        rootStateHash: states[0].hash,
        nextStateHashes: [states[1].hash],
        cost: Number(event.cost),
        ruleName: event.ruleName,
        metadata: event.metadata ? JSON.stringify(event.metadata) : undefined,
        codex: jsonCodex<SystemState>().key,
        hash: event.hash,
      },
    });
  }
}

await exploreHanoi(3);
