import type { LexicalIndex, StateTransition } from "@statespace/core";

// BFS algorithm options
export interface BFSOptions {
  stepLimit?: number;
  visitLimit?: number;
  timeLimit?: number; // milliseconds
}

// DFS algorithm options
export interface DFSOptions {
  depthLimit?: number;
  visitLimit?: number;
  timeLimit?: number; // milliseconds
}

// Result types
export interface PathResult {
  found: boolean;
  path: StateTransition[];
  steps: number;
  target?: LexicalIndex;
  visitedStates: number;
  searchTimeMs: number;
}

export interface ReachabilityResult {
  reachableStates: Set<LexicalIndex>;
  visitedStates: number;
  searchTimeMs: number;
}

export interface CycleResult {
  found: boolean;
  cycles: LexicalIndex[][];
  visitedStates: number;
  searchTimeMs: number;
}
