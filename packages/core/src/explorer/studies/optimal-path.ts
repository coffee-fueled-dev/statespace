import type { PathfindingStudy, Node } from "./types";

/**
 * Configuration for the optimal path BFS algorithm.
 */
export interface OptimalPathConfig<T extends object>
  extends PathfindingStudy<T> {
  /** Optional function to decide whether to add a node to the queue when a cheaper path exists */
  shouldReplace?: (existingCost: number, newCost: number) => boolean;
}

/**
 * BFS algorithm to find optimal path using the Explorer class.
 * @returns The optimal path (sequence of transition indices) and total cost, or null if no path is found.
 */
export async function optimalPath<T extends object>(
  config: OptimalPathConfig<T>
): Promise<{ path: string[]; cost: number } | null> {
  const {
    explorer,
    initialState,
    targetCondition,
    priorityFunction,
    shouldReplace = (existingCost, newCost) => newCost < existingCost,
    limit,
  } = config;

  // Queue to store nodes to visit
  const queue: Node<T>[] = [];

  // A map to store the lowest cost found so far to reach a given state
  const visitedCosts = new Map<string, number>();
  let iterations = 0;

  // Create the start node and add it to the queue
  const startNode: Node<T> = {
    state: initialState,
    path: [],
    cost: 0,
  };

  queue.push(startNode);
  visitedCosts.set(await explorer.encode(initialState), 0);

  // Queue management functions
  const enqueueNode = (node: Node<T>) => {
    if (priorityFunction) {
      insertNodeByPriority(queue, node, priorityFunction);
    } else {
      queue.push(node);
    }
  };

  const dequeueNode = (): Node<T> | undefined => {
    return queue.shift();
  };

  // Main search loop
  while (queue.length > 0) {
    // Check limits
    iterations++;
    if (iterations >= limit.maxIterations) {
      console.log(
        `Search stopped: reached max iterations (${limit.maxIterations})`
      );
      return null;
    }

    // Check max states limit using explorer's internal tracking
    if (explorer["states"].size >= limit.maxStates) {
      console.log(`Search stopped: reached max states (${limit.maxStates})`);
      return null;
    }

    const currentNode = dequeueNode();
    if (!currentNode) continue;

    const { state, path, cost } = currentNode;

    // Check if we've reached the target
    if (targetCondition(state)) {
      console.log("Target state found!");
      return { path, cost };
    }

    // Explore neighbors using iterator for fine-grained resource control
    let transitionIndex = 0;
    for await (const neighborState of explorer.neighborIterator(state)) {
      // Check limits after each neighbor (more granular control)
      if (iterations >= limit.maxIterations) {
        console.log(
          `Search stopped: reached max iterations (${limit.maxIterations})`
        );
        return null;
      }

      if (explorer["states"].size >= limit.maxStates) {
        console.log(`Search stopped: reached max states (${limit.maxStates})`);
        return null;
      }

      const transitionName = `transition_${transitionIndex}`;
      const transitionCost = 1; // Default cost, could be configurable

      const neighborHash = await explorer.encode(neighborState);
      const newCost = cost + transitionCost;

      // Check if this path to the neighbor is better than any existing path
      if (shouldAddNode(neighborHash, newCost, visitedCosts, shouldReplace)) {
        visitedCosts.set(neighborHash, newCost);

        const childNode: Node<T> = {
          state: neighborState,
          path: [...path, transitionName],
          cost: newCost,
        };

        enqueueNode(childNode);
      }

      transitionIndex++;
    }
  }

  // If the loop finishes and the target is not found, there is no valid path
  console.log("Search finished. No path found.");
  return null;
}

/**
 * Inserts a node into the queue based on priority function (lower priority = higher precedence)
 */
function insertNodeByPriority<T extends object>(
  queue: Node<T>[],
  node: Node<T>,
  priorityFunction: (node: Node<T>) => number
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
