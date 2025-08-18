import { z } from "zod";
import { BFS, jsonKey } from "../../src";
import type { TransitionRules } from "../../src/transitions/types";

// =============================================================================
// 1. DEFINE THE SYSTEM STATE (Frontend + Backend)
// =============================================================================

// Define a schema for a single Post
const PostSchema = z.object({
  userId: z.number(),
  id: z.number(),
  title: z.string(),
  body: z.string(),
});

// Define the schema for our complete system state
// This models both the frontend application AND the backend database
const SystemStateSchema = z.object({
  // Frontend application state
  frontend: z.object({
    posts: z.array(PostSchema), // Posts currently loaded in the UI
    loading: z.boolean(), // Is an API call in progress?
    newPostDraft: PostSchema.optional(), // Draft post being created
  }),
  // Backend database state
  backend: z.object({
    posts: z.array(PostSchema), // All posts stored in the database
    nextId: z.number(), // Next available ID for new posts
  }),
});

type SystemState = z.infer<typeof SystemStateSchema>;

// =============================================================================
// 2. DEFINE THE API TRANSITIONS (Frontend ↔ Backend Communication)
// =============================================================================

const apiTransitionRules: TransitionRules<SystemState> = {
  // User starts creating a new post (frontend only)
  "start-new-post": {
    constraint: (state) => {
      const errors = [];
      if (state.frontend.loading) {
        errors.push("Cannot start new post while API call is in progress");
      }
      if (state.frontend.newPostDraft) {
        errors.push("Already drafting a new post");
      }
      return { allowed: errors.length === 0, errors };
    },
    effect: (state) => ({
      frontend: {
        ...state.frontend,
        newPostDraft: {
          userId: 1,
          id: 0, // Temporary ID, will be assigned by backend
          title: "New Post",
          body: "Post content...",
        },
      },
    }),
  },

  // User submits the draft post to the backend
  "create-post-api": {
    constraint: (state) => {
      const errors = [];
      if (state.frontend.loading) {
        errors.push("API call already in progress");
      }
      if (!state.frontend.newPostDraft) {
        errors.push("No draft post to submit");
      }
      return { allowed: errors.length === 0, errors };
    },
    effect: (state) => {
      const draft = state.frontend.newPostDraft!;
      const newPost = {
        ...draft,
        id: state.backend.nextId, // Backend assigns real ID
      };
      return {
        frontend: {
          ...state.frontend,
          loading: true,
          newPostDraft: undefined, // Clear draft
        },
        backend: {
          posts: [...state.backend.posts, newPost],
          nextId: state.backend.nextId + 1,
        },
      };
    },
    cost: 2, // Creating costs more than reading
  },

  // Frontend fetches all posts from backend
  "fetch-posts-api": {
    constraint: (state) => {
      const errors = [];
      if (state.frontend.loading) {
        errors.push("API call already in progress");
      }
      return { allowed: errors.length === 0, errors };
    },
    effect: (state) => ({
      frontend: {
        ...state.frontend,
        loading: true,
      },
    }),
    cost: 1,
  },

  // API call completes - posts are loaded into frontend
  "fetch-posts-complete": {
    constraint: (state) => {
      const errors = [];
      if (!state.frontend.loading) {
        errors.push("No API call in progress");
      }
      return { allowed: errors.length === 0, errors };
    },
    effect: (state) => ({
      frontend: {
        ...state.frontend,
        posts: [...state.backend.posts], // Copy all backend posts to frontend
        loading: false,
      },
    }),
  },

  // Backend operation: seed initial data (simulates existing data)
  "seed-backend": {
    constraint: (state) => {
      const errors = [];
      if (state.backend.posts.length > 0) {
        errors.push("Backend already has data");
      }
      return { allowed: errors.length === 0, errors };
    },
    effect: (state) => ({
      backend: {
        posts: [
          {
            userId: 1,
            id: 1,
            title: "Welcome Post",
            body: "Welcome to our platform!",
          },
          {
            userId: 2,
            id: 2,
            title: "Getting Started",
            body: "Here's how to get started...",
          },
        ],
        nextId: 3,
      },
    }),
  },
};

// =============================================================================
// 3. CONFIGURE AND RUN THE SEARCH
// =============================================================================

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

  // Run the BFS search to find the optimal path to our goal state.
  const result = await BFS({
    systemSchema: SystemStateSchema,
    initialState,
    transitionRules: apiTransitionRules,
    targetCondition,
    keyGenerator: jsonKey<SystemState>(),
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
