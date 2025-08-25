import { APISystem, exampleState, type API } from "./config";
import { detectCycle, jsonCodex } from "@statespace/core";

async function detectApiCycles() {
  const cycleResult = await detectCycle({
    system: APISystem,
    initialState: exampleState,
    codex: jsonCodex<API>(),
    maxDepth: 20,
  });

  return cycleResult;
}

if (import.meta.main) {
  try {
    const cycleResult = await detectApiCycles();

    if (cycleResult) {
      console.log("✅ Cycle detected!");
      console.log(`Cycle path: ${cycleResult.cycle.join(" → ")}`);
      console.log(`Cycle cost: ${cycleResult.cost}`);
    } else {
      console.log("❌ No cycles found within search limits");
    }
  } catch (error) {
    console.error("Error during DFS cycle detection:", error);
  }
}
