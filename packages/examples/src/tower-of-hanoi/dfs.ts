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

  const cycleResult = await detectCycle({
    systemSchema: SystemStateSchema,
    initialState,
    transitionRules,
    codex: jsonCodex<SystemState>(),
    maxDepth: 50,
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

async function main() {
  try {
    await detectHanoiCycles(1);
  } catch (error) {
    console.error("Error during DFS cycle detection:", error);
  }
}

main().catch(console.error);
