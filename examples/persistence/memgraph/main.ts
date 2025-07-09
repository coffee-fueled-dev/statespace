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
import {
  createMemgraphAdapter,
  processBatches,
  createBatches,
  closeAdapter,
  type MarkovLink,
} from "@statespace/adapters";

async function main() {
  const adapter = createMemgraphAdapter(genericSystemConfig);

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
    const allMarkovLinks: MarkovLink[] = [];

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

      allMarkovLinks.push(...markovLinks);
    }

    // Process all links in batches
    const batches = createBatches(allMarkovLinks, 50);
    await processBatches(adapter, batches, {
      maxConcurrency: 2,
      maxRetries: 3,
    });

    // Process single additional link
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

      const singleBatch = createBatches([singleLink], 1);
      await processBatches(adapter, singleBatch);
    }

    console.log("Persistence example completed successfully");
    await closeAdapter(adapter);
  } catch (error) {
    console.error("Error:", error);
    await closeAdapter(adapter);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
