import { z } from "zod";
import {
  type TransitionRule,
  type TransitionRules,
  constraint,
  effect,
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
    constraint: constraint<SystemState>()
      .path(source)
      .isNotEmpty(`Source peg ${source} must have at least one disk`)
      .custom(
        (state) => validPlacement(state[source], state[destination]),
        `Cannot place larger disk on smaller disk (${source} -> ${destination})`
      ),

    effect: effect<SystemState>()
      .path(source)
      .transform((sourcePeg) => sourcePeg.slice(0, -1)) // Remove top disk
      .path(destination)
      .transform((destPeg, originalState) => [
        ...destPeg,
        originalState[source][originalState[source].length - 1], // Get disk from original state
      ]),
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
