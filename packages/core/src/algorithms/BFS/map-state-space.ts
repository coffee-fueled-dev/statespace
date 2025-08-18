import type z from "zod";
import {
  expandRecursive,
  type StateKey,
  type ExpansionConfig,
} from "./expand-recursive";

export type StateSpaceExplorationConfig<TSchema extends z.ZodRawShape> = Omit<
  ExpansionConfig<TSchema>,
  "onTransition"
>;

type MarkovGraph = Map<
  StateKey,
  Record<StateKey, { cost: number; ruleName: string }>
>;

export async function mapStateSpace<TSchema extends z.ZodRawShape>(
  config: StateSpaceExplorationConfig<TSchema>
): Promise<MarkovGraph> {
  const markovChains: MarkovGraph = new Map();

  await expandRecursive({
    ...config,
    onTransition: ({ fromState, toState, ...event }) => {
      // Get existing transitions for this state or create new object
      const existingTransitions = markovChains.get(fromState.stateKey) || {};

      // Add the new transition
      markovChains.set(fromState.stateKey, {
        ...existingTransitions,
        [toState.stateKey]: event,
      });
    },
  });

  return markovChains;
}
