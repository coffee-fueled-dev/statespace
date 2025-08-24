import { z } from "zod/v4";
import {
  compileConstraint,
  compileEffect,
  type TransitionRules,
} from "@statespace/core";

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

export const transitionRules: TransitionRules<SystemState> = {
  // User starts creating a new post (frontend only)
  "start-new-post": {
    name: "start-new-post",
    constraint: compileConstraint({
      constraints: [
        {
          type: "path",
          path: "frontend.loading",
          require: {
            type: "boolean",
            require: { operator: "false" },
          },
        },
        {
          type: "path",
          path: "frontend.newPostDraft",
          require: {
            type: "undefined",
          },
        },
      ],
    }),
    effect: compileEffect<SystemState>([
      {
        path: "frontend.newPostDraft",
        operation: "set",
        value: {
          userId: 1,
          id: 0, // Temporary ID, will be assigned by backend
          title: "New Post",
          body: "Post content...",
        },
      },
    ]),
  },

  // User submits the draft post to the backend
  "create-post-api": {
    name: "create-post-api",
    constraint: compileConstraint({
      constraints: [
        {
          type: "path",
          path: "frontend.loading",
          require: {
            type: "boolean",
            require: { operator: "false" },
          },
        },
      ],
    }),
    effect: compileEffect<SystemState>([
      {
        path: "backend.posts",
        operation: "set",
        value: true,
      },
      {
        path: "frontend.newPostDraft",
        operation: "unset",
      },
      {
        path: "backend.posts",
        operation: "transform",
        transformFn: (currentPosts, originalState) => [
          ...currentPosts,
          originalState.frontend.newPostDraft!,
        ],
      },
      {
        path: "backend.nextId",
        operation: "increment",
      },
    ]),
  },

  // Frontend fetches all posts from backend
  "fetch-posts-api": {
    name: "fetch-posts-api",
    constraint: compileConstraint({
      constraints: [
        {
          type: "path",
          path: "frontend.loading",
          require: {
            type: "boolean",
            require: { operator: "false" },
          },
        },
      ],
    }),
    effect: compileEffect<SystemState>([
      {
        path: "frontend.loading",
        operation: "set",
        value: true,
      },
    ]),
  },

  // API call completes - posts are loaded into frontend
  "fetch-posts-complete": {
    name: "fetch-posts-complete",
    constraint: compileConstraint({
      constraints: [
        {
          type: "path",
          path: "frontend.loading",
          require: {
            type: "boolean",
            require: { operator: "true" },
          },
        },
      ],
    }),
    effect: compileEffect<SystemState>([
      {
        path: "frontend.posts",
        operation: "copy",
        sourcePath: "backend.posts",
      },
      {
        path: "frontend.loading",
        operation: "set",
        value: false,
      },
    ]),
  },

  // Backend operation: seed initial data (simulates existing data)
  "seed-backend": {
    name: "seed-backend",
    constraint: compileConstraint({
      constraints: [
        {
          type: "path",
          path: "backend.posts",
          require: {
            type: "array",
            require: [{ operator: "nonempty" }],
          },
        },
      ],
    }),
    effect: compileEffect([
      {
        path: "backend.posts",
        operation: "set",
        value: [
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
      },
      {
        path: "backend.nextId",
        operation: "set",
        value: 3,
      },
    ]),
  },
};
