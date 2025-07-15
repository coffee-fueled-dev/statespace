import {
  encode,
  decode,
  transitionEngines,
  type InternalSystemState,
  type Element,
  type StatespaceConfig,
  type StateTransition,
  permutationToInternalState,
} from "@statespace/core";
import type {
  PositionHandler,
  PositionType,
} from "@statespace/position-handlers";

export interface ExampleResult {
  bfTransitions: StateTransition[];
  firstDfTransition: StateTransition | undefined;
}

export function runExample(
  config: StatespaceConfig,
  positionHandlers: Record<PositionType, PositionHandler>,
  seedIndex: number
): ExampleResult {
  const permutation = decode(seedIndex, config.elements, config.containers);
  const state = permutationToInternalState(permutation, config.containers);

  const encodeState = (state: InternalSystemState) => {
    const permutation: Element[] = [];
    state.containers.forEach((container) => {
      permutation.push(...container.slots);
    });
    return encode(permutation, config.elements, config.containers);
  };

  // Breadth-first generation
  const bfTransitions = transitionEngines.breadthFirst(
    state,
    encodeState,
    positionHandlers
  );

  // Depth-first generation
  const dfGenerator = transitionEngines.depthFirst(
    state,
    encodeState,
    positionHandlers
  );

  const firstDfTransition = dfGenerator.next().value;

  return {
    bfTransitions,
    firstDfTransition,
  };
}
