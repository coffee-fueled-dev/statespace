import { z } from "zod/v4";
import {
  type TransitionRule,
  type TransitionRules,
  createConstraintFunction,
  createEffectFunction,
  createInstruction,
} from "@statespace/core";

// =============================================================================
// DEFINE THE SYSTEM STATE
// =============================================================================

// Define the state schema for the Tower of Hanoi puzzle.
// The state consists of three pegs (A, B, C), each holding an array of disk sizes.
// The disks are represented by numbers (1 = smallest disk, n = largest disk).
// The arrays are ordered from the bottom of the peg to the top.
export const SystemStateSchema = z.object({
  pegA: z.array(z.number()),
  pegB: z.array(z.number()),
  pegC: z.array(z.number()),
});

export type SystemState = z.infer<typeof SystemStateSchema>;

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

function createMoveRule(
  source: keyof SystemState,
  destination: keyof SystemState
): TransitionRule<SystemState> {
  return {
    name: `${source}->${destination}`,
    constraint: createConstraintFunction({
      constraints: [
        {
          type: "path",
          path: source,
          require: {
            type: "array",
            require: [{ operator: "nonempty" }],
          },
        },
        {
          type: "custom",
          require: {
            type: "custom",
            require: (transitionEvent) => ({
              allowed: validPlacement(
                transitionEvent.nextState[source],
                transitionEvent.nextState[destination]
              ),
            }),
          },
        },
      ],
    }),

    effect: createEffectFunction({
      instructions: [
        createInstruction<SystemState, typeof source>({
          path: source,
          operation: "transform",
          transformFn: (sourcePeg) => sourcePeg.slice(0, -1),
        }),
        createInstruction<SystemState, typeof destination>({
          path: destination,
          operation: "transform",
          transformFn: (destinationPeg, originalState) => [
            ...destinationPeg,
            originalState[source][originalState[source].length - 1], // Get disk from original state
          ],
        }),
      ],
    }),
  };
}

// Define all possible transition rules for a 3-peg system.
export const transitionRules: TransitionRules<SystemState> = {
  // Move from A to B
  "A->B": createMoveRule("pegA", "pegB"),
  // Move from A to C
  "A->C": createMoveRule("pegA", "pegC"),
  // Move from B to A
  "B->A": createMoveRule("pegB", "pegA"),
  // Move from B to C
  "B->C": createMoveRule("pegB", "pegC"),
  // Move from C to A
  "C->A": createMoveRule("pegC", "pegA"),
  // Move from C to B
  "C->B": createMoveRule("pegC", "pegB"),
};
