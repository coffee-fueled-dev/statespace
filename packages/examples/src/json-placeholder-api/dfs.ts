// =============================================================================
// JSON PLACEHOLDER API DFS CYCLE DETECTION
// =============================================================================

import { transitionRules, SystemStateSchema, type SystemState } from "./config";
import { detectCycle, jsonCodex } from "@statespace/core";

console.log("=== JSON Placeholder API DFS Cycle Detection ===");

// Function to detect cycles in API workflow using DFS
async function detectApiCycles() {
  console.log("\n🔍 Detecting cycles in API workflow using DFS...");

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

  // DFS cycle detection
  const cycleResult = await detectCycle({
    systemSchema: SystemStateSchema,
    initialState,
    transitionRules,
    codex: jsonCodex<SystemState>(),
    maxDepth: 20, // Reasonable limit for API workflow exploration
  });

  if (cycleResult) {
    console.log("✅ Cycle detected in API workflow!");
    console.log(`Cycle path: ${cycleResult.cycle.join(" → ")}`);
    console.log(`Cycle cost: ${cycleResult.cost}`);

    // Analyze the cycle
    console.log("\n🔍 Cycle Analysis:");
    if (
      cycleResult.cycle.includes("fetch-posts-api") &&
      cycleResult.cycle.includes("fetch-posts-complete")
    ) {
      console.log("  📡 Found API request/response cycle (fetch posts)");
    }
    if (
      cycleResult.cycle.includes("start-new-post") &&
      cycleResult.cycle.includes("create-post-api")
    ) {
      console.log("  ✏️ Found post creation workflow cycle");
    }
  } else {
    console.log("❌ No cycles found within search limits");
  }

  return cycleResult;
}

// Function to demonstrate DFS behavior with different starting states
async function demonstrateApiDFSFromDifferentStates() {
  console.log("\n\n=== DFS Cycle Detection from Different API States ===");

  // Test case 1: Start with backend already seeded
  console.log("\n🔄 Testing DFS with pre-seeded backend:");
  const stateWithData: SystemState = {
    frontend: {
      posts: [],
      loading: false,
      newPostDraft: undefined,
    },
    backend: {
      posts: [
        {
          userId: 1,
          id: 1,
          title: "Welcome Post",
          body: "Welcome to our platform!",
        },
      ],
      nextId: 2,
    },
  };

  const resultWithData = await detectCycle({
    systemSchema: SystemStateSchema,
    initialState: stateWithData,
    transitionRules,
    codex: jsonCodex<SystemState>(),
    maxDepth: 15,
  });

  if (resultWithData) {
    console.log(
      `Found cycle: ${resultWithData.cycle.join(" → ")} (cost: ${
        resultWithData.cost
      })`
    );
  } else {
    console.log("No cycle found");
  }

  // Test case 2: Start with loading state
  console.log("\n🔄 Testing DFS with API call in progress:");
  const stateLoading: SystemState = {
    frontend: {
      posts: [],
      loading: true, // API call already in progress
      newPostDraft: undefined,
    },
    backend: {
      posts: [],
      nextId: 1,
    },
  };

  const resultLoading = await detectCycle({
    systemSchema: SystemStateSchema,
    initialState: stateLoading,
    transitionRules,
    codex: jsonCodex<SystemState>(),
    maxDepth: 10,
  });

  if (resultLoading) {
    console.log(
      `Found cycle: ${resultLoading.cycle.join(" → ")} (cost: ${
        resultLoading.cost
      })`
    );
  } else {
    console.log("No cycle found");
  }

  // Test case 3: Start with a draft post
  console.log("\n🔄 Testing DFS with draft post:");
  const stateWithDraft: SystemState = {
    frontend: {
      posts: [],
      loading: false,
      newPostDraft: {
        userId: 1,
        id: 0,
        title: "Draft Post",
        body: "This is a draft...",
      },
    },
    backend: {
      posts: [],
      nextId: 1,
    },
  };

  const resultWithDraft = await detectCycle({
    systemSchema: SystemStateSchema,
    initialState: stateWithDraft,
    transitionRules,
    codex: jsonCodex<SystemState>(),
    maxDepth: 12,
  });

  if (resultWithDraft) {
    console.log(
      `Found cycle: ${resultWithDraft.cycle.join(" → ")} (cost: ${
        resultWithDraft.cost
      })`
    );
  } else {
    console.log("No cycle found");
  }
}

// Function to demonstrate DFS depth-first behavior
async function demonstrateDepthFirstBehavior() {
  console.log("\n\n=== Demonstrating DFS Depth-First Behavior ===");

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

  // Test with very limited depth to show DFS goes deep first
  console.log("\n🔍 Testing with maxDepth=3 to show depth-first exploration:");
  const shallowResult = await detectCycle({
    systemSchema: SystemStateSchema,
    initialState,
    transitionRules,
    codex: jsonCodex<SystemState>(),
    maxDepth: 3,
  });

  if (shallowResult) {
    console.log(
      `Found cycle within depth 3: ${shallowResult.cycle.join(" → ")}`
    );
    console.log("This shows DFS explores deeply before trying other paths");
  } else {
    console.log("No cycle found within depth limit of 3");
  }

  // Test with deeper exploration
  console.log("\n🔍 Testing with maxDepth=6 for deeper exploration:");
  const deeperResult = await detectCycle({
    systemSchema: SystemStateSchema,
    initialState,
    transitionRules,
    codex: jsonCodex<SystemState>(),
    maxDepth: 6,
  });

  if (deeperResult) {
    console.log(
      `Found cycle within depth 6: ${deeperResult.cycle.join(" → ")}`
    );
    console.log(`Cycle length: ${deeperResult.cycle.length} transitions`);
  } else {
    console.log("No cycle found within depth limit of 6");
  }
}

// Main execution
async function main() {
  try {
    // Basic cycle detection
    await detectApiCycles();

    // Test different starting states
    await demonstrateApiDFSFromDifferentStates();

    // Demonstrate depth-first behavior
    await demonstrateDepthFirstBehavior();

    console.log("\n✨ DFS cycle detection analysis complete!");
  } catch (error) {
    console.error("Error during DFS cycle detection:", error);
  }
}

// Run the example
main().catch(console.error);
