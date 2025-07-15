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
import { config } from "@statespace/example-generic-system/config";
import {
  createMemgraphAdapter,
  closeAdapter,
  type MarkovLink,
} from "@statespace/adapters";
import { createQueueProcessor } from "./queue";
import { bfs } from "@statespace/analysis";

async function main() {
  const adapter = createMemgraphAdapter(config);

  logSpaceEstimates(config);

  const positionHandlers = { start, end, any };

  const encodeState = (state: InternalSystemState): number => {
    const permutation: Element[] = [];
    state.containers.forEach((container) => {
      permutation.push(...container.slots);
    });
    return encode(permutation, config.elements, config.containers);
  };

  const getState = (index: number): InternalSystemState | undefined => {
    try {
      const permutation = decode(index, config.elements, config.containers);
      return permutationToInternalState(permutation, config.containers);
    } catch {
      return undefined;
    }
  };

  try {
    // Create queue processor with custom options
    const queueProcessor = createQueueProcessor(adapter, {
      batchSize: 50,
      maxConcurrency: 2,
      timeout: 30000,
      maxRetries: 3,
    });

    // Start from strategic seed states instead of sequential indices
    const seedStates = [10];

    console.log(
      `Starting graph expansion from ${seedStates.length} seed states...`
    );

    // Use recursive graph expansion to build a well-connected subgraph
    const expansion = bfs.recursiveGraphExpansion(
      getState,
      encodeState,
      positionHandlers,
      seedStates,
      {
        levels: 3, // Expand 3 levels deep from each seed
        visitLimit: 500, // Limit total states to explore
        timeLimit: 60000, // 1 minute timeout
        emitFrequency: 10, // Process in batches of 10
      }
    );

    let discoveredCount = 0;
    let markovLinkBuffer: MarkovLink[] = [];

    for await (const discoveredState of expansion) {
      discoveredCount++;

      if (discoveredCount % 50 === 0) {
        console.log(
          `Discovered ${discoveredCount} states (level ${discoveredState.level})`
        );
      }

      // Get the actual state
      const currentState = getState(discoveredState.index);
      if (!currentState) continue;

      // Generate transitions from this discovered state
      const transitions = transitionEngines.breadthFirst(
        currentState,
        encodeState,
        positionHandlers
      );

      const markovLinks: MarkovLink[] = transitions.map((transition) => ({
        fromStateIndex: discoveredState.index,
        toStateIndex: transition.lexicalIndex,
        transition: transition,
      }));

      // Add to buffer and queue processor
      markovLinkBuffer.push(...markovLinks);

      // Process in batches for better performance
      if (markovLinkBuffer.length >= 100) {
        queueProcessor.addLinks(markovLinkBuffer);
        markovLinkBuffer = [];
      }
    }

    // Process any remaining links
    if (markovLinkBuffer.length > 0) {
      queueProcessor.addLinks(markovLinkBuffer);
    }

    console.log(
      `Graph expansion complete. Discovered ${discoveredCount} total states.`
    );

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
