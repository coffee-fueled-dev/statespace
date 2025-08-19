import type z from "zod";
import {
  expandRecursive,
  type Hash,
  type ExpansionConfig,
} from "./expand-recursive";
import type { TransitionRule } from "../../transitions";
import type { System } from "../../types";

export type ExploreInMemoryConfig<TSchema extends z.ZodRawShape> = Omit<
  ExpansionConfig<TSchema>,
  "onTransition"
>;

export type MarkovChain = [
  Hash,
  Hash,
  {
    cost: number;
    ruleName: string;
    metadata?: TransitionRule<System>["metadata"];
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

export async function exploreInMemory<TSchema extends z.ZodRawShape>(
  config: ExploreInMemoryConfig<TSchema>
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

  await expandRecursive({
    ...config,
    onTransition: ({ fromState, toState, ...event }) => {
      // Track iteration metrics
      if (event.ruleName === "initial") {
        // Initial state discovery
        statesExplored = 1;
        stateTransitionCounts.set(fromState.hash, 0);
        return;
      }

      iterationsPerformed++;

      // Get existing transitions for this state or create new object
      const existingTransitions = markovChains.get(fromState.hash) || {};

      // Add the new transition
      const updatedTransitions = {
        ...existingTransitions,
        [toState.hash]: event,
      };
      markovChains.set(fromState.hash, updatedTransitions);

      // Update branching factor tracking
      const currentBranchingFactor = Object.keys(updatedTransitions).length;
      const previousBranchingFactor =
        stateTransitionCounts.get(fromState.hash) || 0;

      stateTransitionCounts.set(fromState.hash, currentBranchingFactor);

      // Update aggregated metrics
      totalTransitions += currentBranchingFactor - previousBranchingFactor;
      maxBranching = Math.max(maxBranching, currentBranchingFactor);
      if (currentBranchingFactor > 0) {
        minBranching = Math.min(minBranching, currentBranchingFactor);
      }

      // Track if new state discovered
      if (toState.isNew) {
        statesExplored++;
        stateTransitionCounts.set(toState.hash, 0);
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
