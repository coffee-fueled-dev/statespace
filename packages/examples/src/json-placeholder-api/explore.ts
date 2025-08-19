// =============================================================================
// JSON PLACEHOLDER API STATE SPACE EXPLORER
// =============================================================================

import { transitionRules, SystemStateSchema, type SystemState } from "./config";
import { exploreInMemory, jsonCodex } from "@statespace/core";

console.log("=== JSON Placeholder API State Space Explorer ===");

// Function to explore the API workflow state space
async function exploreApiWorkflow() {
  console.log("\n🔍 Exploring API workflow state space...");

  // Initial state: Clean slate - no posts anywhere, no loading
  const initialState: SystemState = {
    frontend: {
      posts: [],
      loading: false,
      newPostDraft: undefined,
    },
    backend: {
      posts: [],
      nextId: 1,
    },
  };

  console.log("Initial State:", JSON.stringify(initialState, null, 2));

  // Map the entire reachable state space with profiling
  const {
    markovGraph,
    profile: { branchingFactorDistribution, ...profile },
  } = await exploreInMemory({
    systemSchema: SystemStateSchema,
    initialState,
    transitionRules,
    codex: jsonCodex<SystemState>(),
    limit: {
      maxIterations: 1000,
      maxStates: 100,
    },
  });

  console.log("Profile:", JSON.stringify(profile, null, 2));

  // Analyze different types of states
  console.log(`\n🔍 State Analysis:`);
  let idleStates = 0;
  let loadingStates = 0;
  let draftingStates = 0;
  let statesWithBackendData = 0;
  let statesWithFrontendData = 0;

  for (const [hash] of markovGraph) {
    const state = await jsonCodex<SystemState>().decode(hash);

    if (!state.frontend.loading && !state.frontend.newPostDraft) idleStates++;
    if (state.frontend.loading) loadingStates++;
    if (state.frontend.newPostDraft) draftingStates++;
    if (state.backend.posts.length > 0) statesWithBackendData++;
    if (state.frontend.posts.length > 0) statesWithFrontendData++;
  }

  console.log(`  Idle states (not loading, no draft): ${idleStates}`);
  console.log(`  Loading states: ${loadingStates}`);
  console.log(`  Drafting states: ${draftingStates}`);
  console.log(`  States with backend data: ${statesWithBackendData}`);
  console.log(`  States with frontend data: ${statesWithFrontendData}`);

  // Find goal states (states where frontend has posts and isn't loading)
  const goalStates: string[] = [];
  for (const [hash] of markovGraph) {
    const state = await jsonCodex<SystemState>().decode(hash);
    if (state.frontend.posts.length > 0 && !state.frontend.loading) {
      goalStates.push(hash);
    }
  }

  console.log(
    `\n🎯 Goal States (frontend has posts, not loading): ${goalStates.length}`
  );

  // Show some interesting workflow paths
  console.log(`\n🔍 Sample states and available actions:`);
  let sampleCount = 0;
  for (const [hash, transitions] of markovGraph) {
    if (sampleCount >= 5) break;

    const state = await jsonCodex<SystemState>().decode(hash);
    const transitionCount = Object.keys(transitions).length;
    const transitionNames = Object.values(transitions).map((t) => t.ruleName);

    console.log(
      `\n  State ${sampleCount + 1}: ${transitionCount} available actions`
    );
    console.log(`    Frontend posts: ${state.frontend.posts.length}`);
    console.log(`    Backend posts: ${state.backend.posts.length}`);
    console.log(`    Loading: ${state.frontend.loading}`);
    console.log(`    Has draft: ${state.frontend.newPostDraft ? "Yes" : "No"}`);
    console.log(`    Available actions: ${transitionNames.join(", ")}`);

    sampleCount++;
  }

  return profile.totalStates;
}

// Main function to run the exploration
async function main() {
  try {
    const stateCount = await exploreApiWorkflow();

    console.log(`\n🎯 Key Insights:`);
    console.log(
      `  • API workflows create complex state spaces due to async operations`
    );
    console.log(`  • Loading states act as intermediate steps in the workflow`);
    console.log(`  • Draft states add additional branching to the state space`);
    console.log(
      `  • Backend and frontend state coordination creates many combinations`
    );
    console.log(`  • Total reachable states: ${stateCount}`);
  } catch (error) {
    console.error("Error during exploration:", error);
  }
}

main().catch(console.error);
