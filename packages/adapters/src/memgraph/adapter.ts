import { Driver } from "neo4j-driver";
import * as memgraph from "neo4j-driver";
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

export interface MemgraphAdapter {
  driver: Driver;
  configHash: string;
}

export interface BatchInsertOptions {
  maxConcurrency?: number;
}

/**
 * Create a memgraph adapter instance
 */
export function createMemgraphAdapter(
  config: StatespaceConfig
): MemgraphAdapter {
  const MEMGRAPH_URI = process.env.MEMGRAPH_URI || "bolt://localhost:7687";
  const MEMGRAPH_USER = process.env.MEMGRAPH_USER || "neo4j";
  const MEMGRAPH_PASS = process.env.MEMGRAPH_PASS || "password";

  const driver = memgraph.driver(
    MEMGRAPH_URI,
    memgraph.auth.basic(MEMGRAPH_USER, MEMGRAPH_PASS),
    {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 30000,
      maxTransactionRetryTime: 15000,
    }
  );

  return {
    driver,
    configHash: encodeConfigSync(config),
  };
}

/**
 * Process a batch of Markov links with retry logic
 */
export async function processBatch(
  adapter: MemgraphAdapter,
  links: MarkovLink[],
  maxRetries: number = 3
): Promise<void> {
  if (links.length === 0) return;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = adapter.driver.session();

    try {
      // Extract unique states with config hash
      const stateIndices = new Set<LexicalIndex>();
      links.forEach((link) => {
        stateIndices.add(link.fromStateIndex);
        stateIndices.add(link.toStateIndex);
      });

      const states = Array.from(stateIndices).map((index) => ({
        index,
        configHash: adapter.configHash,
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

      // Success - break out of retry loop
      return;
    } catch (error: any) {
      // Check if this is a retriable error
      const isRetriable =
        error.code === "Memgraph.TransientError.MemgraphError.MemgraphError" ||
        error.retriable === true ||
        error.gqlStatus === "50N42";

      if (isRetriable && attempt < maxRetries) {
        // Wait with exponential backoff before retrying
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // If not retriable or we've exhausted retries, throw the error
      throw error;
    } finally {
      await session.close();
    }
  }
}

/**
 * Process multiple batches with concurrency control
 */
export async function processBatches(
  adapter: MemgraphAdapter,
  batches: MarkovLink[][],
  options: BatchInsertOptions & { maxRetries?: number } = {}
): Promise<void> {
  const maxConcurrency = options.maxConcurrency ?? 5;
  const maxRetries = options.maxRetries ?? 3;

  // Process batches with concurrency limit
  for (let i = 0; i < batches.length; i += maxConcurrency) {
    const batchGroup = batches.slice(i, i + maxConcurrency);
    await Promise.all(
      batchGroup.map((batch) => processBatch(adapter, batch, maxRetries))
    );
  }
}

/**
 * Get all states for the adapter's config
 */
export async function getStatesForConfig(
  adapter: MemgraphAdapter
): Promise<LexicalIndex[]> {
  const session = adapter.driver.session();
  try {
    const result = await session.run(GET_STATES_BY_CONFIG_QUERY, {
      configHash: adapter.configHash,
    });
    return result.records.map((record) => record.get("stateIndex"));
  } finally {
    await session.close();
  }
}

/**
 * Get config from any state index
 */
export async function getConfigFromState(
  adapter: MemgraphAdapter,
  stateIndex: LexicalIndex
): Promise<StatespaceConfig | null> {
  const session = adapter.driver.session();
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
 * Close the adapter and its driver
 */
export async function closeAdapter(adapter: MemgraphAdapter): Promise<void> {
  await adapter.driver.close();
}

/**
 * Get the config hash for the adapter
 */
export function getConfigHash(adapter: MemgraphAdapter): string {
  return adapter.configHash;
}

/**
 * Get the config for the adapter
 */
export function getConfig(adapter: MemgraphAdapter): StatespaceConfig {
  return decodeConfigSync(adapter.configHash);
}

/**
 * Helper function to create batches from an array
 */
export function createBatches<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}
