import { z } from "zod";
import { BFS, jsonKey } from "../../src";
import type { TransitionRules } from "../../src/transitions/types";

// =============================================================================
// DEFINE THE SYSTEM STATE (Frontend + Backend)
// =============================================================================

// Define a schema for a single Post
export const PostSchema = z.object({
  userId: z.number(),
  id: z.number(),
  title: z.string(),
  body: z.string(),
});

// Define the schema for our complete system state
// This models both the frontend application AND the backend database
export const SystemStateSchema = z.object({
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

export type SystemState = z.infer<typeof SystemStateSchema>;

// =============================================================================
// DEFINE THE API TRANSITIONS (Frontend ↔ Backend Communication)
// =============================================================================

export const apiTransitionRules: TransitionRules<SystemState> = {
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
      ...state,
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
        ...state,
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
      ...state,
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
      ...state,
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
      ...state,
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
