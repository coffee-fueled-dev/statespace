import { jsonCodex } from "@statespace/core";
import { optimalPath } from "@statespace/core";

// =============================================================================
// JSON PLACEHOLDER API BREADTH FIRST SEARCH SOLVER
// =============================================================================

import { transitionRules, SystemStateSchema, type SystemState } from "./config";

// Set the initial system state: empty frontend, empty backend
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

// Define the target condition: frontend has loaded posts from backend
const targetCondition = (state: SystemState) => {
  return state.frontend.posts.length > 0 && !state.frontend.loading;
};

// Main function to run the example.
async function exploreApiWorkflow() {
  console.log("=== Frontend/Backend API Workflow Explorer ===");
  console.log("Initial State:", JSON.stringify(initialState, null, 2));
  console.log("\nFinding optimal path to load posts in frontend...");

  const result = await optimalPath({
    systemSchema: SystemStateSchema,
    initialState,
    transitionRules,
    targetCondition,
    codex: jsonCodex<SystemState>(),
  });

  if (result) {
    console.log("\n✅ Optimal workflow found!");
    console.log(`Total cost: ${result.cost}`);
    console.log("Sequence of actions:");
    result.path.forEach((action, i) => {
      console.log(`  ${i + 1}. ${action}`);
    });

    console.log("\n🔍 This shows the most efficient way to:");
    console.log("  • Set up backend data");
    console.log("  • Make API calls");
    console.log("  • Load data into the frontend");
    console.log("  • Handle the async loading states properly");
  } else {
    console.log("\n❌ No valid workflow found within the given constraints.");
  }
}

// Run the explorer.
exploreApiWorkflow();
