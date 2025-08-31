import type { StateSpace } from "../../..";

export const state = {
  a: {
    b: {
      c: 0,
    },
  },
};

export const JSONSchemaDeclaration = {
  shape: {
    type: "object",
    required: [],
    properties: {
      a: {
        type: "object",
        required: [],
        properties: {
          b: {
            type: "object",
            required: [],
            properties: {
              c: {
                type: "number",
              },
            },
          },
        },
      },
    },
  },
  transitions: [
    {
      effect: {
        name: "increment",
        path: "a.b.c",
        operation: "add",
        value: 1,
      },
      constraints: [
        {
          phase: "before_transition",
          path: "a.b",
          schema: {
            type: "object",
            required: [],
            properties: {
              c: {
                type: "number",
              },
            },
          },
        },
      ],
    },
  ],
} satisfies StateSpace<typeof state>;
