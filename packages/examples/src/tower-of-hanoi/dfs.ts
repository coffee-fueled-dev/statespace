import { jsonCodex, detectCycle } from "@statespace/core";
import { SystemStateSchema, transitionRules, type SystemState } from "./config";

console.log("=== Tower of Hanoi DFS Cycle Detection ===");

// Function to detect cycles in Tower of Hanoi state space using DFS
async function detectHanoiCycles(numberOfDisks: number) {
  console.log(
    `\n🔍 Detecting cycles in ${numberOfDisks}-disk Tower of Hanoi using DFS...`
  );

  // Set the initial state: all disks are on peg A
  const initialState: SystemState = {
    pegA: Array.from({ length: numberOfDisks }, (_, i) => numberOfDisks - i),
    pegB: [],
    pegC: [],
  };

  console.log("Initial state:", initialState);

  // DFS cycle detection
  const cycleResult = await detectCycle({
    systemSchema: SystemStateSchema,
    initialState,
    transitionRules,
    codex: jsonCodex<SystemState>(),
    maxDepth: 50, // Reasonable limit for DFS exploration
  });

  if (cycleResult) {
    console.log("✅ Cycle detected!");
    console.log(`Cycle path: ${cycleResult.cycle.join(" → ")}`);
    console.log(`Cycle cost: ${cycleResult.cost}`);
  } else {
    console.log("❌ No cycles found within search limits");
  }

  return cycleResult;
}

// Function to demonstrate DFS behavior with different starting states
async function demonstrateDFSFromDifferentStates() {
  console.log("\n\n=== DFS Cycle Detection from Different Starting States ===");

  // Test case 1: One disk on peg B
  console.log("\n🔄 Testing DFS with disk on peg B:");
  const stateB: SystemState = {
    pegA: [],
    pegB: [1],
    pegC: [],
  };

  const resultB = await detectCycle({
    systemSchema: SystemStateSchema,
    initialState: stateB,
    transitionRules,
    codex: jsonCodex<SystemState>(),
    maxDepth: 20,
  });

  if (resultB) {
    console.log(
      `Found cycle: ${resultB.cycle.join(" → ")} (cost: ${resultB.cost})`
    );
  } else {
    console.log("No cycle found");
  }

  // Test case 2: Two disks split between pegs
  console.log("\n🔄 Testing DFS with disks split between pegs:");
  const stateSplit: SystemState = {
    pegA: [2],
    pegB: [1],
    pegC: [],
  };

  const resultSplit = await detectCycle({
    systemSchema: SystemStateSchema,
    initialState: stateSplit,
    transitionRules,
    codex: jsonCodex<SystemState>(),
    maxDepth: 20,
  });

  if (resultSplit) {
    console.log(
      `Found cycle: ${resultSplit.cycle.join(" → ")} (cost: ${
        resultSplit.cost
      })`
    );
  } else {
    console.log("No cycle found");
  }

  // Test case 3: Demonstrate DFS depth-first behavior
  console.log(
    "\n🔍 Testing DFS with limited depth to show depth-first behavior:"
  );
  const resultLimitedDepth = await detectCycle({
    systemSchema: SystemStateSchema,
    initialState: stateB,
    transitionRules,
    codex: jsonCodex<SystemState>(),
    maxDepth: 3, // Very limited depth to show DFS explores deeply first
  });

  if (resultLimitedDepth) {
    console.log(
      `Found cycle within depth 3: ${resultLimitedDepth.cycle.join(
        " → "
      )} (cost: ${resultLimitedDepth.cost})`
    );
  } else {
    console.log("No cycle found within depth limit of 3");
  }
}

// Main execution
async function main() {
  try {
    // Test DFS cycle detection with different numbers of disks
    await detectHanoiCycles(1);
    await detectHanoiCycles(2);

    // Demonstrate DFS behavior with different starting states
    await demonstrateDFSFromDifferentStates();
  } catch (error) {
    console.error("Error during DFS cycle detection:", error);
  }
}

// Run the example
main().catch(console.error);
