// =============================================================================
// TOWER OF HANOI STATE SPACE EXPLORER
// =============================================================================

import {
  TowerOfHanoiStateSchema,
  TowerOfHanoiTransitionRules,
  type TowerOfHanoiState,
} from "./config";
import { exploreInMemory, jsonKey } from "../../src";

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

  const {
    profile: { branchingFactorDistribution, ...profile },
  } = await exploreInMemory({
    systemSchema: TowerOfHanoiStateSchema,
    initialState,
    transitionRules: TowerOfHanoiTransitionRules,
    keyGenerator: jsonKey<TowerOfHanoiState>(),
    limit: {
      maxIterations: 1000,
      maxStates: 500,
    },
  });

  console.log("Profile:", JSON.stringify(profile, null, 2));

  return profile.totalStates;
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
