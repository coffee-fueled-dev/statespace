import { APISystem, exampleState, type API } from "./config";
import { exploreInMemory, jsonCodex } from "@statespace/core";

console.log("=== JSON Placeholder API State Space Explorer ===");

if (import.meta.main) {
  console.log("\n🔍 Exploring API workflow state space...");

  const {
    markovGraph: _markovGraph,
    profile: { branchingFactorDistribution, ...profile },
  } = await exploreInMemory({
    system: APISystem,
    initialState: exampleState,
    codex: jsonCodex<API>(),
    limit: {
      maxIterations: 1000,
      maxStates: 100,
    },
  });

  console.log("Profile:", JSON.stringify(profile, null, 2));
}
