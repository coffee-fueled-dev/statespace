import {
  encode,
  decode,
  transitionEngines,
  permutationToInternalState,
  type InternalSystemState,
  type Element,
} from "@statespace/core";
import { start, end, any } from "@statespace/position-handlers";
import { genericSystemConfig } from "../config.js";
import { createMemgraphAdapter, type MarkovLink } from "@statespace/adapters";

async function main() {
  const adapter = createMemgraphAdapter(genericSystemConfig, {
    batchSize: 50,
    maxConcurrency: 2,
    flushInterval: 1000,
  });

  const positionHandlers = { start, end, any };

  const encodeState = (state: InternalSystemState): number => {
    const permutation: Element[] = [];
    state.containers.forEach((container) => {
      permutation.push(...container.slots);
    });
    return encode(
      permutation,
      genericSystemConfig.elementBank,
      genericSystemConfig.containers
    );
  };

  try {
    const seedIndices = [0, 10, 50, 100, 200];

    for (const seedIndex of seedIndices) {
      const permutation = decode(
        seedIndex,
        genericSystemConfig.elementBank,
        genericSystemConfig.containers
      );
      const currentState = permutationToInternalState(
        permutation,
        genericSystemConfig.containers
      );

      const transitions = transitionEngines.breadthFirst(
        currentState,
        encodeState,
        positionHandlers
      );

      const markovLinks: MarkovLink[] = transitions.map((transition) => ({
        fromStateIndex: seedIndex,
        toStateIndex: transition.lexicalIndex,
        transition: transition,
      }));

      adapter.enqueueBatch(markovLinks);
    }

    await adapter.flush();

    const singlePermutation = decode(
      999,
      genericSystemConfig.elementBank,
      genericSystemConfig.containers
    );
    const singleState = permutationToInternalState(
      singlePermutation,
      genericSystemConfig.containers
    );

    const singleTransitions = transitionEngines.breadthFirst(
      singleState,
      encodeState,
      positionHandlers
    );

    if (singleTransitions.length > 0) {
      const singleLink: MarkovLink = {
        fromStateIndex: 999,
        toStateIndex: singleTransitions[0].lexicalIndex,
        transition: singleTransitions[0],
      };
      adapter.enqueue(singleLink);
    }

    await adapter.close();
  } catch (error) {
    console.error("Error:", error);
    await adapter.close();
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
