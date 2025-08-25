import {
  makeExecutableSystem,
  type Schema,
  type Shape,
  type Transition,
} from "@statespace/core";

// =============================================================================
// DEFINE THE SYSTEM STATE
// =============================================================================

// Define the state schema for the Tower of Hanoi puzzle.
// The state consists of three pegs (A, B, C), each holding an array of disk sizes.
// The disks are represented by numbers (1 = smallest disk, n = largest disk).
// The arrays are ordered from the bottom of the peg to the top.
export type HanoiState = Shape<typeof HanoiSchema>;
export const HanoiSchema = {
  pegA: {
    type: "array",
    require: [
      {
        operator: "shape",
        value: {
          type: "number",
        },
      },
    ],
  },
  pegB: {
    type: "array",
    require: [
      {
        operator: "shape",
        value: {
          type: "number",
        },
      },
    ],
  },
  pegC: {
    type: "array",
    require: [
      {
        operator: "shape",
        value: {
          type: "number",
        },
      },
    ],
  },
} satisfies Schema;

// Helper function to check if a disk can be placed on a destination peg
function validPlacement(
  sourcePeg: number[],
  destinationPeg: number[]
): boolean {
  const sourceDisk = sourcePeg[sourcePeg.length - 1];
  const destinationDisk = destinationPeg[destinationPeg.length - 1];
  return destinationPeg.length === 0 || sourceDisk < destinationDisk;
}

// =============================================================================
// DEFINE THE TRANSITION RULES
// =============================================================================

const createMoveRule = (
  source: keyof HanoiState,
  destination: keyof HanoiState
): Transition<typeof HanoiSchema> => ({
  name: `${source}->${destination}`,
  constraints: [
    {
      phase: "before_transition",
      type: "path",
      path: source,
      require: {
        type: "array",
        require: [{ operator: "length", args: { method: "gt", value: 0 } }],
      },
    },
    {
      type: "custom",
      require: {
        type: "custom",
        require: (transitionEvent) => ({
          allowed: validPlacement(
            transitionEvent.nextState.shape[source],
            transitionEvent.nextState.shape[destination]
          ),
        }),
      },
    },
  ],

  effects: [
    {
      path: source,
      operation: "transform",
      transformFn: (sourcePeg: number[]) => sourcePeg.slice(0, -1),
    },
    {
      path: destination,
      operation: "transform",
      transformFn: (destinationPeg: number[], originalState) => [
        ...destinationPeg,
        originalState[source][originalState[source].length - 1], // Get disk from original state
      ],
    },
  ],
});

export const HanoiSystem = makeExecutableSystem({
  schema: HanoiSchema,
  transitionRules: (
    [
      ["pegA", "pegB"],
      ["pegA", "pegC"],
      ["pegB", "pegA"],
      ["pegB", "pegC"],
      ["pegC", "pegA"],
      ["pegC", "pegB"],
    ] as const
  ).map(([source, destination]) =>
    createMoveRule(source, destination)
  ) as Transition<typeof HanoiSchema>[],
});
