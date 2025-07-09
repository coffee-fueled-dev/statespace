import { Driver } from "neo4j-driver";
import { memgraphDriver } from "./driver";
import {
  BATCH_UPSERT_STATES_AND_TRANSITIONS_QUERY,
  GET_STATES_BY_CONFIG_QUERY,
  GET_CONFIG_FROM_STATE_QUERY,
} from "./operations";
import type {
  StateTransition,
  LexicalIndex,
  StatespaceConfig,
} from "@statespace/core";
import { encodeConfigSync, decodeConfigSync } from "../util/config-hash";

export interface MarkovLink {
  fromStateIndex: LexicalIndex;
  toStateIndex: LexicalIndex;
  transition: StateTransition;
}

export interface BatchInsertOptions {
  batchSize?: number;
  maxConcurrency?: number;
  flushInterval?: number; // milliseconds
}

export class MemgraphAdapter {
  private driver: Driver;
  private queue: MarkovLink[] = [];
  private isProcessing = false;
  private flushTimer?: NodeJS.Timeout;
  private options: Required<BatchInsertOptions>;
  private configHash: string;

  constructor(config: StatespaceConfig, options: BatchInsertOptions = {}) {
    this.driver = memgraphDriver;
    this.configHash = encodeConfigSync(config);
    this.options = {
      batchSize: options.batchSize ?? 1000,
      maxConcurrency: options.maxConcurrency ?? 5,
      flushInterval: options.flushInterval ?? 5000,
    };
  }

  /**
   * Get the config hash for this adapter
   */
  getConfigHash(): string {
    return this.configHash;
  }

  /**
   * Decode the config from the hash
   */
  getConfig(): StatespaceConfig {
    return decodeConfigSync(this.configHash);
  }

  /**
   * Add a first-order Markov link to the queue
   */
  enqueue(link: MarkovLink): void {
    this.queue.push(link);

    // Auto-flush if batch size reached
    if (this.queue.length >= this.options.batchSize) {
      this.flush();
    }

    // Reset flush timer
    this.resetFlushTimer();
  }

  /**
   * Add multiple Markov links to the queue
   */
  enqueueBatch(links: MarkovLink[]): void {
    this.queue.push(...links);

    // Auto-flush if batch size reached
    if (this.queue.length >= this.options.batchSize) {
      this.flush();
    }

    this.resetFlushTimer();
  }

  /**
   * Force flush the queue immediately
   */
  async flush(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    this.clearFlushTimer();

    try {
      // Process queue in batches with concurrency control
      const batches = this.createBatches(this.queue, this.options.batchSize);
      this.queue = []; // Clear queue immediately

      // Process batches with concurrency limit
      const concurrentBatches = this.createConcurrentBatches(
        batches,
        this.options.maxConcurrency
      );

      for (const batchGroup of concurrentBatches) {
        await Promise.all(batchGroup.map((batch) => this.processBatch(batch)));
      }
    } finally {
      this.isProcessing = false;
      this.resetFlushTimer();
    }
  }

  /**
   * Process a single batch of Markov links
   */
  private async processBatch(links: MarkovLink[]): Promise<void> {
    const session = this.driver.session();

    try {
      // Extract unique states with config hash
      const stateIndices = new Set<LexicalIndex>();
      links.forEach((link) => {
        stateIndices.add(link.fromStateIndex);
        stateIndices.add(link.toStateIndex);
      });

      const states = Array.from(stateIndices).map((index) => ({
        index,
        configHash: this.configHash,
      }));

      // Prepare transition data
      const transitions = links.map((link) => ({
        fromIndex: link.fromStateIndex,
        toIndex: link.toStateIndex,
        element: link.transition.element,
        fromContainer: link.transition.fromContainer,
        toContainer: link.transition.toContainer,
        transitionType: link.transition.transitionType,
        cost: link.transition.cost,
        metadata: link.transition.metadata || {},
      }));

      // Execute batch upsert
      await session.run(BATCH_UPSERT_STATES_AND_TRANSITIONS_QUERY, {
        states,
        transitions,
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Get all states for this config
   */
  async getStatesForConfig(): Promise<LexicalIndex[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(GET_STATES_BY_CONFIG_QUERY, {
        configHash: this.configHash,
      });
      return result.records.map((record) => record.get("stateIndex"));
    } finally {
      await session.close();
    }
  }

  /**
   * Get config from any state index
   */
  async getConfigFromState(
    stateIndex: LexicalIndex
  ): Promise<StatespaceConfig | null> {
    const session = this.driver.session();
    try {
      const result = await session.run(GET_CONFIG_FROM_STATE_QUERY, {
        stateIndex,
      });

      if (result.records.length === 0) return null;

      const configHash = result.records[0].get("configHash");
      return decodeConfigSync(configHash);
    } finally {
      await session.close();
    }
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Group batches for concurrent processing
   */
  private createConcurrentBatches<T>(
    batches: T[][],
    maxConcurrency: number
  ): T[][][] {
    const concurrentBatches: T[][][] = [];
    for (let i = 0; i < batches.length; i += maxConcurrency) {
      concurrentBatches.push(batches.slice(i, i + maxConcurrency));
    }
    return concurrentBatches;
  }

  /**
   * Reset the auto-flush timer
   */
  private resetFlushTimer(): void {
    this.clearFlushTimer();
    this.flushTimer = setTimeout(() => {
      this.flush();
    }, this.options.flushInterval);
  }

  /**
   * Clear the auto-flush timer
   */
  private clearFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Check if adapter is currently processing
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Close the adapter and flush remaining data
   */
  async close(): Promise<void> {
    this.clearFlushTimer();
    await this.flush();
    await this.driver.close();
  }
}

// Export a factory function instead of default instance
export function createMemgraphAdapter(
  config: StatespaceConfig,
  options?: BatchInsertOptions
): MemgraphAdapter {
  return new MemgraphAdapter(config, options);
}
