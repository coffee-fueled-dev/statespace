// =============================================================================
// TOWER OF HANOI STATE SPACE EXPLORER
// =============================================================================

import {
  TowerOfHanoiStateSchema,
  TowerOfHanoiTransitionRules,
  type TowerOfHanoiState,
} from "./config";
import { mapStateSpace, jsonKey } from "../../src";

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

  // Map the entire reachable state space
  const markovGraph = await mapStateSpace({
    systemSchema: TowerOfHanoiStateSchema,
    initialState,
    transitionRules: TowerOfHanoiTransitionRules,
    keyGenerator: jsonKey<TowerOfHanoiState>(),
    limit: {
      maxIterations: 1000, // High limit - should explore everything
      maxStates: 500, // Reasonable limit for visualization
    },
  });

  // Analyze the state space
  console.log(`\n📊 State Space Analysis:`);
  console.log(`  Total reachable states: ${markovGraph.size}`);
  console.log(
    `  Theoretical maximum states: ${Math.pow(
      2,
      numberOfDisks * 3
    )} (unrestricted)`
  );

  // Calculate transitions and branching factor
  let totalTransitions = 0;
  let maxBranching = 0;
  let minBranching = Infinity;
  const branchingFactors: number[] = [];

  for (const [stateKey, transitions] of markovGraph) {
    const branchingFactor = Object.keys(transitions).length;
    totalTransitions += branchingFactor;
    branchingFactors.push(branchingFactor);
    maxBranching = Math.max(maxBranching, branchingFactor);
    minBranching = Math.min(minBranching, branchingFactor);
  }

  const avgBranching = totalTransitions / markovGraph.size;

  console.log(`  Total transitions: ${totalTransitions}`);
  console.log(`  Average branching factor: ${avgBranching.toFixed(2)}`);
  console.log(`  Max branching factor: ${maxBranching}`);
  console.log(
    `  Min branching factor: ${minBranching === Infinity ? 0 : minBranching}`
  );

  // Find the goal state (all disks on peg C)
  const goalState = await jsonKey<TowerOfHanoiState>().encode({
    pegA: [],
    pegB: [],
    pegC: Array.from({ length: numberOfDisks }, (_, i) => numberOfDisks - i),
  });

  const hasGoalState = markovGraph.has(goalState);
  console.log(`  Goal state reachable: ${hasGoalState ? "✅ Yes" : "❌ No"}`);

  // Show some interesting states
  console.log(`\n🔍 Sample states and transitions:`);
  let sampleCount = 0;
  for (const [stateKey, transitions] of markovGraph) {
    if (sampleCount >= 3) break;

    const state = await jsonKey<TowerOfHanoiState>().decode(stateKey);
    const transitionCount = Object.keys(transitions).length;
    const transitionNames = Object.values(transitions).map((t) => t.ruleName);

    console.log(`  State ${sampleCount + 1}: ${transitionCount} transitions`);
    console.log(`    Pegs: A=${state.pegA} B=${state.pegB} C=${state.pegC}`);
    console.log(`    Available moves: ${transitionNames.join(", ")}`);
    sampleCount++;
  }

  return markovGraph.size;
}

// Explore different numbers of disks to see how state space grows
async function main() {
  const results: { disks: number; states: number }[] = [];

  for (let disks = 1; disks <= 4; disks++) {
    const stateCount = await exploreHanoi(disks);
    results.push({ disks, states: stateCount });
  }

  console.log(`\n📈 State Space Growth Summary:`);
  console.log(
    `${"Disks".padEnd(8)} | ${"States".padEnd(8)} | Theoretical Optimal`
  );
  console.log(`${"-".repeat(8)} | ${"-".repeat(8)} | ${"-".repeat(18)}`);

  results.forEach(({ disks, states }) => {
    const theoretical = Math.pow(2, disks) - 1; // Optimal moves for Tower of Hanoi
    console.log(
      `${disks.toString().padEnd(8)} | ${states
        .toString()
        .padEnd(8)} | ${theoretical} moves optimal`
    );
  });

  console.log(`\n🎯 Key Insights:`);
  console.log(`  • Tower of Hanoi has a highly constrained state space`);
  console.log(`  • Most states have 1-3 valid moves (low branching factor)`);
  console.log(`  • State count grows much slower than theoretical maximum`);
  console.log(`  • All goal states are reachable (perfect puzzle design!)`);
}

main().catch(console.error);
