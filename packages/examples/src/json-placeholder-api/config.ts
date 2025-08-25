import { makeExecutableSystem, type Shape } from "@statespace/core";

export type API = Shape<typeof APISystem.rawShape.schema>;
export const APISystem = makeExecutableSystem({
  schema: {
    frontend: {
      posts: {
        type: "array",
        require: [
          {
            operator: "shape",
            value: {
              type: "object",
              require: {
                userId: { type: "number" },
                id: { type: "number" },
                title: { type: "string" },
                body: { type: "string" },
              },
            },
          },
        ],
      },
      loading: {
        type: "boolean",
      },
      newPostDraft: {
        type: "object",
        require: {
          userId: { type: "number" },
          id: { type: "number" },
          title: { type: "string" },
          body: { type: "string" },
        },
      },
    },
    backend: {
      posts: {
        type: "array",
        require: [
          {
            operator: "shape",
            value: {
              type: "object",
              require: {
                userId: { type: "number" },
                id: { type: "number" },
                title: { type: "string" },
                body: { type: "string" },
              },
            },
          },
        ],
      },
      nextId: {
        type: "number",
      },
    },
  },
  transitionRules: [
    {
      cost: 1,
      name: "start-new-post",
      effects: [
        {
          path: "frontend.newPostDraft",
          operation: "set",
          value: {
            userId: 1,
            id: 0,
            title: "New Post",
            body: "Post content...",
          },
        },
      ],
      constraints: [
        {
          phase: "before_transition",
          type: "path",
          path: "frontend.loading",
          require: {
            type: "boolean",
            require: { operator: "false" },
          },
        },
        {
          phase: "before_transition",
          type: "path",
          path: "frontend.newPostDraft",
          require: {
            type: "undefined",
          },
        },
      ],
    },
    {
      cost: 1,
      name: "create-post-api",
      effects: [
        {
          path: "frontend.loading",
          operation: "set",
          value: true,
        },
        {
          path: "frontend.newPostDraft",
          operation: "unset",
        },
        {
          path: "backend.posts",
          operation: "append",
          value: {
            userId: 1,
            id: 1,
            title: "New Post",
            body: "Post content...",
          },
        },
        {
          path: "backend.nextId",
          operation: "increment",
        },
      ],
      constraints: [
        {
          phase: "before_transition",
          type: "path",
          path: "frontend.loading",
          require: {
            type: "boolean",
            require: { operator: "false" },
          },
        },
      ],
    },
    {
      cost: 1,
      name: "fetch-posts-api",
      effects: [
        {
          path: "frontend.loading",
          operation: "set",
          value: true,
        },
      ],
      constraints: [
        {
          phase: "before_transition",
          type: "path",
          path: "frontend.loading",
          require: {
            type: "boolean",
            require: { operator: "false" },
          },
        },
      ],
    },
    {
      cost: 1,
      name: "fetch-posts-complete",
      effects: [
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
      ],
      constraints: [
        {
          phase: "before_transition",
          type: "path",
          path: "frontend.loading",
          require: {
            type: "boolean",
            require: { operator: "true" },
          },
        },
      ],
    },
    {
      cost: 1,
      name: "seed-backend",
      effects: [
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
      ],
      constraints: [
        {
          phase: "before_transition",
          type: "path",
          path: "backend.posts",
          require: {
            type: "array",
          },
        },
      ],
    },
  ],
});

export const exampleState: API = {
  frontend: {
    posts: [],
    loading: false,
    newPostDraft: {
      userId: 1,
      id: 1,
      title: "Test Post",
      body: "This is a test post",
    },
  },
  backend: {
    posts: [],
    nextId: 1,
  },
};
