import type { LexicalIndex, InternalSystemState } from "@statespace/core";
import type {
  PositionHandler,
  PositionType,
} from "@statespace/position-handlers";
import { transitionEngines } from "@statespace/core";
import type { BFSOptions } from "../types";

export interface GraphExpansionOptions extends BFSOptions {
  levels?: number;
  emitFrequency?: number; // Emit discovered states every N states (default: 1)
}

export interface DiscoveredState {
  index: LexicalIndex;
  level: number;
  fromState: LexicalIndex | null;
  discoveryOrder: number;
}

/**
 * Recursively expand graph from multiple starting states, emitting newly discovered states
 */
export async function* recursiveGraphExpansion(
  getState: (index: LexicalIndex) => InternalSystemState | undefined,
  encodeState: (state: InternalSystemState) => number,
  positionHandlers: Record<PositionType, PositionHandler>,
  origins: LexicalIndex[],
  options: GraphExpansionOptions = {}
): AsyncGenerator<DiscoveredState, void, unknown> {
  const startTime = performance.now();
  const {
    levels = 3,
    visitLimit = Infinity,
    timeLimit = 30000,
    emitFrequency = 1,
  } = options;

  const discovered = new Set<LexicalIndex>();
  let discoveryOrder = 0;
  let emitBuffer: DiscoveredState[] = [];

  // Initialize with origins
  let currentLevel = new Set<LexicalIndex>();
  for (const origin of origins) {
    if (!discovered.has(origin)) {
      discovered.add(origin);
      currentLevel.add(origin);

      const discoveredState: DiscoveredState = {
        index: origin,
        level: 0,
        fromState: null,
        discoveryOrder: discoveryOrder++,
      };

      emitBuffer.push(discoveredState);

      // Emit if buffer is full or we're emitting every state
      if (emitBuffer.length >= emitFrequency) {
        for (const state of emitBuffer) {
          yield state;
        }
        emitBuffer = [];
      }
    }
  }

  // Expand level by level
  for (let level = 0; level < levels; level++) {
    // Check time limit
    if (performance.now() - startTime > timeLimit) {
      break;
    }

    // Check visit limit
    if (discovered.size >= visitLimit) {
      break;
    }

    if (currentLevel.size === 0) {
      break; // No more states to expand
    }

    const nextLevel = new Set<LexicalIndex>();

    // Process all states in current level
    for (const stateIndex of currentLevel) {
      // Check time limit within level processing
      if (performance.now() - startTime > timeLimit) {
        break;
      }

      const currentState = getState(stateIndex);
      if (!currentState) continue;

      // Get all transitions from this state
      const transitions = transitionEngines.breadthFirst(
        currentState,
        encodeState,
        positionHandlers
      );

      for (const transition of transitions) {
        const nextIndex = transition.lexicalIndex;

        if (!discovered.has(nextIndex)) {
          discovered.add(nextIndex);
          nextLevel.add(nextIndex);

          const discoveredState: DiscoveredState = {
            index: nextIndex,
            level: level + 1,
            fromState: stateIndex,
            discoveryOrder: discoveryOrder++,
          };

          emitBuffer.push(discoveredState);

          // Emit if buffer is full
          if (emitBuffer.length >= emitFrequency) {
            for (const state of emitBuffer) {
              yield state;
            }
            emitBuffer = [];
          }

          // Check visit limit
          if (discovered.size >= visitLimit) {
            break;
          }
        }
      }

      // Check visit limit at state level
      if (discovered.size >= visitLimit) {
        break;
      }
    }

    currentLevel = nextLevel;
  }

  // Emit any remaining states in buffer
  for (const state of emitBuffer) {
    yield state;
  }
}
