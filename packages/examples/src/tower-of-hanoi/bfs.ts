// =============================================================================
// TOWER OF HANOI BREADTH FIRST SEARCH SOLVER
// =============================================================================

import { SystemStateSchema, transitionRules, type SystemState } from "./config";
import { optimalPath, jsonCodex } from "@statespace/core";

// Number of disks to solve
const numberOfDisks = 3;

// Set the initial state: all disks are on peg A.
const initialState: SystemState = {
  pegA: Array.from({ length: numberOfDisks }, (_, i) => numberOfDisks - i),
  pegB: [],
  pegC: [],
};

// Define the target condition: all disks are on peg C.
const targetCondition = (state: SystemState) => {
  return state.pegC.length === numberOfDisks;
};

// Main function to run the example
async function solveHanoi() {
  console.log(`Solving Tower of Hanoi with ${numberOfDisks} disks...`);
  console.log("Initial State:", initialState);

  const result = await optimalPath({
    systemSchema: SystemStateSchema,
    initialState,
    transitionRules,
    targetCondition,
    codex: jsonCodex<SystemState>(),
  });

  if (result) {
    console.log("\n✅ Solution Found!");
    console.log(`Total Moves (Cost): ${result.cost}`);
    console.log("Optimal Path:");
    console.log(`Steps: ${result.path.join(" → ")}`);
  } else {
    console.log("\n❌ No solution found within the given constraints.");
  }
}

// Run the solver
solveHanoi();
