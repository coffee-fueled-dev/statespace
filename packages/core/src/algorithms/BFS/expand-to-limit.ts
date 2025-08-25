import type { System } from "../../schema.zod";
import type { Hash } from "../../transitions";
import type { Shape } from "../../schema";
import {
  generateNeighbors,
  type GenerateNeighborsConfig,
  type GenerateNeighborsEvent,
} from "./generate-neighbors";

export interface ExpandToLimitEvent<TSystem extends System>
  extends GenerateNeighborsEvent<TSystem> {
  currentState: { shape: Shape<TSystem["schema"]>; hash?: Hash };
}

export interface ExpandToLimitHooks<TSystem extends System> {
  onTransition?: (event: ExpandToLimitEvent<TSystem>) => Promise<void> | void;
  onCycleDetected?: (
    event: ExpandToLimitEvent<TSystem>
  ) => Promise<void> | void;
}

export interface ExpandToLimitConfig<TSystem extends System>
  extends GenerateNeighborsConfig<TSystem>,
    ExpandToLimitHooks<TSystem> {
  limit: {
    maxIterations: number;
    maxStates?: number; // Optional limit on number of states to explore
  };
}

/**
 * Recursively expands the state graph from an initial state
 */
export async function expandToLimit<TSystem extends System>({
  system,
  initialState,
  codex,
  limit: { maxIterations, maxStates = Infinity },
  onTransition,
  onCycleDetected,
}: ExpandToLimitConfig<TSystem>): Promise<void> {
  const states = new Map<Hash, Shape<TSystem["schema"]>>();

  const explorationQueue: Array<{
    shape: Shape<TSystem["schema"]>;
    hash: Hash;
  }> = [];

  // Initialize with the starting state
  const initialHash = await codex.encode(initialState);
  states.set(initialHash, initialState);
  explorationQueue.push({ shape: initialState, hash: initialHash });

  let iterationsPerformed = 0;

  while (
    explorationQueue.length > 0 &&
    iterationsPerformed < maxIterations &&
    states.size < maxStates
  ) {
    const currentState = explorationQueue.shift()!;
    iterationsPerformed++;

    await generateNeighbors({
      system,
      initialState,
      codex,
      visitedStates: states,
      shouldContinue: () => states.size < maxStates,
      onTransition: async ({ result, isNewState }) => {
        onTransition?.({ currentState, result, isNewState });

        if (!result.systemState.hash) {
          throw new Error("Transition result has no hash");
        }

        if (isNewState) {
          states.set(result.systemState.hash, result.systemState.shape);
          explorationQueue.push({
            shape: result.systemState.shape,
            hash: result.systemState.hash,
          });
        }
      },
      onCycleDetected: async ({ result, isNewState }) => {
        onCycleDetected?.({ currentState, result, isNewState });
      },
    });
  }
}
