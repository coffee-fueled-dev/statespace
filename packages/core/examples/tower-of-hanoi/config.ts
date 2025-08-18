import { z } from "zod";
import type {
  TransitionRule,
  TransitionRules,
} from "../../src/transitions/types";

// =============================================================================
// DEFINE THE SYSTEM STATE
// =============================================================================

// Define the state schema for the Tower of Hanoi puzzle.
// The state consists of three pegs (A, B, C), each holding an array of disk sizes.
// The disks are represented by numbers (1 = smallest disk, n = largest disk).
// The arrays are ordered from the bottom of the peg to the top.
export const TowerOfHanoiStateSchema = z.object({
  pegA: z.array(z.number()),
  pegB: z.array(z.number()),
  pegC: z.array(z.number()),
});

export type TowerOfHanoiState = z.infer<typeof TowerOfHanoiStateSchema>;

// Helper function to check if a move is valid
function canMove(sourcePeg: number[], destinationPeg: number[]): boolean {
  // A disk can only be moved from a non-empty peg.
  if (sourcePeg.length === 0) {
    return false;
  }
  // A larger disk cannot be placed on top of a smaller disk.
  const sourceDisk = sourcePeg[sourcePeg.length - 1];
  const destinationDisk = destinationPeg[destinationPeg.length - 1];
  return destinationPeg.length === 0 || sourceDisk < destinationDisk;
}

// =============================================================================
// DEFINE THE TRANSITION RULES
// =============================================================================

// TransitionRule factory to create move rules between any two pegs.
function createMoveRule(
  source: keyof TowerOfHanoiState,
  destination: keyof TowerOfHanoiState
): TransitionRule<TowerOfHanoiState> {
  return {
    // The constraint checks if the move is valid
    constraint: (state) => {
      // Create copies to simulate the move without modifying the original state
      const sourcePeg = [...state[source]];
      const destinationPeg = [...state[destination]];
      const allowed = canMove(sourcePeg, destinationPeg);
      return { allowed: allowed };
    },
    // The effect defines the state changes when the rule is applied
    effect: (state) => {
      // Move the top disk from source to destination
      const diskToMove = state[source][state[source].length - 1];
      return {
        [source]: state[source].slice(0, -1),
        [destination]: [...state[destination], diskToMove],
      };
    },
    // The cost of each move is 1, as we want to find the shortest path
    cost: 1,
  };
}

// Define all possible transition rules for a 3-peg system.
export const TowerOfHanoiTransitionRules: TransitionRules<TowerOfHanoiState> = {
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
