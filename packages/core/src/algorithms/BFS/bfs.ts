import z from "zod/v4";
import type { System } from "../../shared/types";
import type {
  TransitionRules,
  TransitionSuccess,
} from "../../transitions/types";
import type { Codex } from "../../codex";
import { applyTransition } from "../../transitions/apply-transition";

/**
 * Inserts a node into the queue based on priority function (lower priority = higher precedence)
 */
function insertNodeByPriority<TSystem>(
  queue: BFSNode<TSystem>[],
  node: BFSNode<TSystem>,
  priorityFunction: (node: BFSNode<TSystem>) => number
): void {
  const priority = priorityFunction(node);
  let insertIndex = queue.length;

  for (let i = 0; i < queue.length; i++) {
    if (priority < priorityFunction(queue[i])) {
      insertIndex = i;
      break;
    }
  }

  queue.splice(insertIndex, 0, node);
}

/**
 * Checks if a new path to a state is better than existing path
 */
function shouldAddNode(
  hash: string,
  newCost: number,
  visitedCosts: Map<string, number>,
  shouldReplace: (existingCost: number, newCost: number) => boolean
): boolean {
  const existingCost = visitedCosts.get(hash);
  return existingCost === undefined || shouldReplace(existingCost, newCost);
}

/**
 * Creates a new BFS node with updated path and cost
 */
function createChildNode<TSchema extends z.ZodRawShape>(
  parentNode: BFSNode<System<TSchema>>,
  ruleName: string,
  newState: System<TSchema>,
  transitionCost: number
): BFSNode<System<TSchema>> {
  return {
    state: newState,
    path: [...parentNode.path, ruleName],
    cost: parentNode.cost + transitionCost,
  };
}

/**
 * Represents a single node in the BFS search graph.
 */
export interface BFSNode<TSystem> {
  state: TSystem;
  path: string[];
  cost: number;
}

/**
 * Configuration for the BFS algorithm.
 */
export interface BFSConfig<TSchema extends z.ZodRawShape> {
  systemSchema: z.ZodObject<TSchema>;
  initialState: System<TSchema>;
  transitionRules: TransitionRules<System<TSchema>>;
  targetCondition: (systemState: System<TSchema>) => boolean;
  codex: Codex<System<TSchema>>;
  /** Optional function to determine node priority (lower = higher priority). If not provided, uses FIFO queue. */
  priorityFunction?: (node: BFSNode<System<TSchema>>) => number;
  /** Optional function to decide whether to add a node to the queue when a cheaper path exists */
  shouldReplace?: (existingCost: number, newCost: number) => boolean;
}

/**
 * Generic BFS implementation that can be extended for different search strategies.
 * @returns The optimal path (sequence of rule names) and total cost, or null if no path is found.
 */
export async function optimalPath<TSchema extends z.ZodRawShape>(
  config: BFSConfig<TSchema>
): Promise<{ path: string[]; cost: number } | null> {
  const {
    systemSchema,
    initialState,
    transitionRules,
    targetCondition,
    codex,
    priorityFunction,
    shouldReplace = (existingCost, newCost) => newCost < existingCost,
  } = config;

  // Queue to store nodes to visit
  const queue: BFSNode<System<TSchema>>[] = [];

  // A map to store the lowest cost found so far to reach a given state
  const visitedCosts = new Map<string, number>();

  // Create the start node and add it to the queue
  const startNode: BFSNode<System<TSchema>> = {
    state: initialState,
    path: [],
    cost: 0,
  };

  queue.push(startNode);
  visitedCosts.set(await codex.encode(initialState), 0);

  // Queue management functions
  const enqueueNode = (node: BFSNode<System<TSchema>>) => {
    if (priorityFunction) {
      insertNodeByPriority(queue, node, priorityFunction);
    } else {
      queue.push(node);
    }
  };

  const dequeueNode = (): BFSNode<System<TSchema>> | undefined => {
    return queue.shift();
  };

  // Neighbor exploration function
  const exploreNeighbors = async (currentNode: BFSNode<System<TSchema>>) => {
    const neighbors = generateBreadth(
      systemSchema,
      currentNode.state,
      transitionRules
    );

    for (const result of neighbors) {
      const childNode = createChildNode(
        currentNode,
        result.ruleName,
        result.systemState,
        result.cost
      );

      const hash = await codex.encode(result.systemState);

      if (shouldAddNode(hash, childNode.cost, visitedCosts, shouldReplace)) {
        visitedCosts.set(hash, childNode.cost);
        enqueueNode(childNode);
      }
    }
  };

  // Main search loop
  while (queue.length > 0) {
    const currentNode = dequeueNode();
    if (!currentNode) continue;

    const { state, path, cost } = currentNode;
    if (targetCondition(state)) {
      console.log("Target state found!");
      return { path, cost };
    }

    // Explore all neighbors and add viable ones to queue
    await exploreNeighbors(currentNode);
  }

  // If the loop finishes and the target is not found, there is no valid path
  console.log("Search finished. No path found.");
  return null;
}

/**
 * Generates all next states from the current state using the given transition rules.
 * @param systemSchema The Zod schema for validation
 * @param currentState The current system state
 * @param transitionRules All available transition rules
 * @returns An array of transition outcomes (successful and optionally failed)
 */
export function generateBreadth<TSchema extends z.ZodRawShape>(
  systemSchema: z.ZodObject<TSchema>,
  currentState: System<TSchema>,
  transitionRules: TransitionRules<System<TSchema>>
): TransitionSuccess<System<TSchema>>[] {
  const results: TransitionSuccess<System<TSchema>>[] = [];

  for (const [ruleName, rule] of Object.entries(transitionRules)) {
    const outcome = applyTransition(systemSchema, currentState, ruleName, rule);

    if (outcome.success) {
      results.push(outcome);
    }
  }

  return results;
}
