import Queue from "queue";
import {
  processBatch,
  type MemgraphAdapter,
  type MarkovLink,
} from "@statespace/adapters";

export interface QueueProcessorOptions {
  batchSize?: number;
  maxConcurrency?: number;
  timeout?: number;
  maxRetries?: number;
}

export interface QueueProcessor {
  addLinks: (links: MarkovLink[]) => void;
  flush: () => void;
  waitForCompletion: () => Promise<void>;
}

/**
 * Creates a queue processor for handling Markov links in batches
 */
export function createQueueProcessor(
  adapter: MemgraphAdapter,
  options: QueueProcessorOptions = {}
): QueueProcessor {
  const {
    batchSize = 50,
    maxConcurrency = 2,
    timeout = 30000,
    maxRetries = 3,
  } = options;

  // Create queue with concurrency control
  const queue = new Queue({
    concurrency: maxConcurrency,
    timeout,
    autostart: true,
    results: [],
  });

  // Buffer to accumulate MarkovLinks
  let markovLinkBuffer: MarkovLink[] = [];
  let isCompleted = false;
  let completionPromise: Promise<void> | null = null;
  let completionResolve: (() => void) | null = null;
  let completionReject: ((error: any) => void) | null = null;
  let totalBatchesProcessed = 0;
  let totalLinksProcessed = 0;

  // Function to add a batch job to the queue
  const addBatchToQueue = (links: MarkovLink[]) => {
    if (links.length === 0) return;

    const batchNumber = totalBatchesProcessed + queue.length + 1;

    queue.push(async () => {
      const remaining = queue.length;
      console.log(
        `[Batch ${batchNumber}] Processing ${links.length} links (${remaining} batches remaining)`
      );

      await processBatch(adapter, links, maxRetries);

      totalBatchesProcessed++;
      totalLinksProcessed += links.length;

      const stillRemaining = queue.length;
      console.log(
        `[Batch ${batchNumber}] ✓ Complete (${totalLinksProcessed} total links processed, ${stillRemaining} batches remaining)`
      );
    });
  };

  // Set up queue event listeners
  queue.addEventListener("success", () => {
    // Individual batch success is now logged in addBatchToQueue
  });

  queue.addEventListener("error", (e) => {
    console.error(`❌ Batch failed:`, e.detail.error);
    if (completionReject) {
      completionReject(e.detail.error);
    }
  });

  queue.addEventListener("timeout", (e) => {
    console.log(`⏰ Batch timed out, continuing...`);
    e.detail.next(); // Continue with next job
  });

  queue.addEventListener("end", () => {
    console.log(
      `🎉 All batches complete! Processed ${totalLinksProcessed} total Markov links in ${totalBatchesProcessed} batches`
    );
    isCompleted = true;
    if (completionResolve) {
      completionResolve();
    }
  });

  return {
    /**
     * Add Markov links to the processing buffer
     */
    addLinks: (links: MarkovLink[]) => {
      if (isCompleted) {
        throw new Error("Queue processor has already completed");
      }

      // Add to buffer
      markovLinkBuffer.push(...links);

      // Check if buffer is ready to be flushed
      while (markovLinkBuffer.length >= batchSize) {
        // Create batch from buffer
        const batch = markovLinkBuffer.splice(0, batchSize);
        addBatchToQueue(batch);
      }
    },

    /**
     * Flush any remaining links in buffer to the queue
     */
    flush: () => {
      if (markovLinkBuffer.length > 0) {
        console.log(
          `📤 Flushing final batch of ${markovLinkBuffer.length} links`
        );
        addBatchToQueue([...markovLinkBuffer]);
        markovLinkBuffer = [];
      }
    },

    /**
     * Wait for all queue jobs to complete
     */
    waitForCompletion: (): Promise<void> => {
      if (isCompleted) {
        return Promise.resolve();
      }

      if (completionPromise) {
        return completionPromise;
      }

      completionPromise = new Promise<void>((resolve, reject) => {
        completionResolve = resolve;
        completionReject = reject;

        // If queue is empty and autostart is off, start it
        if (!queue.autostart && queue.length === 0) {
          queue.start();
        }
      });

      return completionPromise;
    },
  };
}
