import { z } from "zod";
import { constraint, effect, type TransitionRules } from "@statespace/core";

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
    constraint: constraint<SystemState>()
      .path("frontend.loading")
      .equals(false, "Cannot start new post while API call is in progress")
      .path("frontend.newPostDraft")
      .notExists("Already drafting a new post"),
    effect: effect<SystemState>().path("frontend.newPostDraft").set({
      userId: 1,
      id: 0, // Temporary ID, will be assigned by backend
      title: "New Post",
      body: "Post content...",
    }),
  },

  // User submits the draft post to the backend
  "create-post-api": {
    constraint: constraint<SystemState>()
      .path("frontend.loading")
      .equals(false, "API call already in progress")
      .path("frontend.newPostDraft")
      .exists("No draft post to submit"),
    effect: effect<SystemState>()
      .path("frontend.loading")
      .set(true)
      .path("frontend.newPostDraft")
      .unset()
      .path("backend.posts")
      .transform((currentPosts, originalState) => [
        ...currentPosts,
        {
          ...originalState.frontend.newPostDraft!,
          id: originalState.backend.nextId, // Backend assigns real ID
        },
      ])
      .path("backend.nextId")
      .increment(),
    cost: 2, // Creating costs more than reading
  },

  // Frontend fetches all posts from backend
  "fetch-posts-api": {
    constraint: constraint<SystemState>()
      .path("frontend.loading")
      .equals(false, "API call already in progress"),
    effect: effect<SystemState>().path("frontend.loading").set(true),
    cost: 1,
  },

  // API call completes - posts are loaded into frontend
  "fetch-posts-complete": {
    constraint: constraint<SystemState>()
      .path("frontend.loading")
      .equals(true, "No API call in progress"),
    effect: effect<SystemState>()
      .path("frontend.posts")
      .copyFrom("backend.posts")
      .path("frontend.loading")
      .set(false),
  },

  // Backend operation: seed initial data (simulates existing data)
  "seed-backend": {
    constraint: constraint<SystemState>()
      .path("backend.posts")
      .arrayLengthEquals(0, "Backend already has data"),
    effect: effect<SystemState>()
      .path("backend.posts")
      .set([
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
      ])
      .path("backend.nextId")
      .set(3),
  },
};
