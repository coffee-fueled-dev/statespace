import {
  encode,
  decode,
  transitionEngines,
  permutationToInternalState,
  type InternalSystemState,
  type Element,
  logSpaceEstimates,
} from "@statespace/core";
import { start, end, any } from "@statespace/position-handlers";
import { genericSystemConfig as config } from "../config.js";
import {
  createMemgraphAdapter,
  closeAdapter,
  type MarkovLink,
} from "@statespace/adapters";
import { createQueueProcessor } from "./queue.js";

async function main() {
  const adapter = createMemgraphAdapter(config);

  logSpaceEstimates(config);

  const positionHandlers = { start, end, any };

  const encodeState = (state: InternalSystemState): number => {
    const permutation: Element[] = [];
    state.containers.forEach((container) => {
      permutation.push(...container.slots);
    });
    return encode(permutation, config.elementBank, config.containers);
  };

  try {
    const limit = 20;

    // Create queue processor with custom options
    const queueProcessor = createQueueProcessor(adapter, {
      batchSize: 50,
      maxConcurrency: 2,
      timeout: 30000,
      maxRetries: 3,
    });

    // Generate transitions and add to queue processor
    for (let i = 0; i < limit; i++) {
      const seedIndex = i;
      const permutation = decode(
        seedIndex,
        config.elementBank,
        config.containers
      );
      const currentState = permutationToInternalState(
        permutation,
        config.containers
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

      // Add links to queue processor
      queueProcessor.addLinks(markovLinks);
    }

    // Flush any remaining links and wait for completion
    queueProcessor.flush();
    await queueProcessor.waitForCompletion();

    console.log("Persistence example completed successfully");
    await closeAdapter(adapter);
  } catch (error) {
    console.error("Error:", error);
    await closeAdapter(adapter);
    process.exit(1);
  }
}

if (import.meta.main) {
  logSpaceEstimates(config);
  main().catch(console.error);
}
