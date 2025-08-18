// =============================================================================
// BREADTH FIRST SOLVER
// =============================================================================

import {
  TowerOfHanoiStateSchema,
  TowerOfHanoiTransitionRules,
  type TowerOfHanoiState,
} from "./config";
import { BFS } from "../../src/algorithms";
import { jsonKey } from "../../src/key-generators/json-key";

// Number of disks to solve
const numberOfDisks = 3;

// Set the initial state: all disks are on peg A.
const initialState: TowerOfHanoiState = {
  pegA: Array.from({ length: numberOfDisks }, (_, i) => numberOfDisks - i),
  pegB: [],
  pegC: [],
};

// Define the target condition: all disks are on peg C.
const targetCondition = (state: TowerOfHanoiState) => {
  return state.pegC.length === numberOfDisks;
};

// Configure the BFS search
const config = {
  systemSchema: TowerOfHanoiStateSchema,
  initialState,
  transitionRules: TowerOfHanoiTransitionRules,
  targetCondition,
  keyGenerator: jsonKey<TowerOfHanoiState>(),
};

// Main function to run the example
async function solveHanoi() {
  console.log(`Solving Tower of Hanoi with ${numberOfDisks} disks...`);
  console.log("Initial State:", initialState);

  // Run the BFS search to find the optimal path
  const result = await BFS(config);

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
