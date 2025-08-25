import type { Hash } from "../../transitions";
import type { System } from "../../schema.zod";
import type { Metadata } from "../../shared";
import { expandToLimit, type ExpandToLimitConfig } from "./expand-to-limit";

export interface ExploreInMemoryConfig<TSystem extends System>
  extends ExpandToLimitConfig<TSystem> {}

export type MarkovChain = [
  Hash,
  Hash,
  {
    cost?: number | null | undefined;
    ruleName: string;
    metadata?: Metadata | null | undefined;
  }
];

type MarkovGraph = Map<MarkovChain[0], Record<MarkovChain[1], MarkovChain[2]>>;

export interface ExploreInMemoryProfile {
  totalStates: number;
  totalTransitions: number;
  averageBranchingFactor: number;
  maxBranchingFactor: number;
  minBranchingFactor: number;
  branchingFactorDistribution: number[];
  explorationMetrics: {
    iterationsPerformed: number;
    statesExplored: number;
    limitsReached: {
      maxStates: boolean;
      maxIterations: boolean;
    };
  };
}

export interface ExploreInMemoryResult {
  markovGraph: MarkovGraph;
  profile: ExploreInMemoryProfile;
}

export async function exploreInMemory<TSystem extends System>(
  config: ExploreInMemoryConfig<TSystem>
): Promise<ExploreInMemoryResult> {
  const markovChains: MarkovGraph = new Map();

  // Online profiling data
  const stateTransitionCounts = new Map<Hash, number>();
  let totalTransitions = 0;
  let maxBranching = 0;
  let minBranching = Infinity;
  let iterationsPerformed = 0;
  let statesExplored = 0;
  let maxStatesReached = false;
  let maxIterationsReached = false;

  await expandToLimit({
    ...config,
    limit: {
      maxIterations: Infinity,
      maxStates: Infinity,
    },
    onTransition: ({ currentState, result, isNewState }) => {
      if (!currentState.hash || !result.systemState.hash) {
        throw new Error("Current or next state hash is undefined");
      }

      iterationsPerformed++;

      // Get existing transitions for this state or create new object
      const existingTransitions = markovChains.get(currentState.hash) || {};

      // Add the new transition
      const updatedTransitions = {
        ...existingTransitions,
        [result.systemState.hash]: result,
      };
      markovChains.set(currentState.hash, updatedTransitions);

      // Update branching factor tracking
      const currentBranchingFactor = Object.keys(updatedTransitions).length;
      const previousBranchingFactor =
        stateTransitionCounts.get(currentState.hash) || 0;

      stateTransitionCounts.set(currentState.hash, currentBranchingFactor);

      // Update aggregated metrics
      totalTransitions += currentBranchingFactor - previousBranchingFactor;
      maxBranching = Math.max(maxBranching, currentBranchingFactor);
      if (currentBranchingFactor > 0) {
        minBranching = Math.min(minBranching, currentBranchingFactor);
      }

      // Track if new state discovered
      if (isNewState) {
        statesExplored++;
        stateTransitionCounts.set(result.systemState.hash, 0);
      }

      // Check if we hit limits (these will be detected in the next iteration)
      if (statesExplored >= (config.limit.maxStates || Infinity)) {
        maxStatesReached = true;
      }
      if (iterationsPerformed >= config.limit.maxIterations) {
        maxIterationsReached = true;
      }
    },
  });

  // Finalize profiling calculations
  const totalStates = markovChains.size;
  const averageBranchingFactor =
    totalStates > 0 ? totalTransitions / totalStates : 0;
  const branchingFactorDistribution = Array.from(
    stateTransitionCounts.values()
  );

  // Handle case where no transitions were found
  const actualMinBranching = minBranching === Infinity ? 0 : minBranching;

  const profile: ExploreInMemoryProfile = {
    totalStates,
    totalTransitions,
    averageBranchingFactor,
    maxBranchingFactor: maxBranching,
    minBranchingFactor: actualMinBranching,
    branchingFactorDistribution,
    explorationMetrics: {
      iterationsPerformed,
      statesExplored,
      limitsReached: {
        maxStates: maxStatesReached,
        maxIterations: maxIterationsReached,
      },
    },
  };

  return {
    markovGraph: markovChains,
    profile,
  };
}
