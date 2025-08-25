import type { Codex } from "../../codex";
import type { Schema, Shape } from "../../schema";
import type { ExecutableSystem } from "../../compile";
import type { System } from "../../schema.zod";
import { generateNeighbors } from "./generate-neighbors";

export interface StudyConfig<TSystem extends System> {
  system: ExecutableSystem<TSystem>;
  initialState: Shape<TSystem["schema"]>;
  codex: Codex<Shape<TSystem["schema"]>>;
}

export interface PathfindingStudy<TSystem extends System>
  extends StudyConfig<TSystem> {
  targetCondition: (systemState: Shape<TSystem["schema"]>) => boolean;
  /** Optional function to determine node priority (lower = higher priority). If not provided, uses FIFO queue. */
  priorityFunction?: (node: BFSNode<Shape<TSystem["schema"]>>) => number;
}

/**
 * Represents a single node in the BFS search graph.
 */
export interface BFSNode<TShape extends Shape<Schema>> {
  state: TShape;
  path: string[];
  cost: number;
}

/**
 * Configuration for the BFS algorithm.
 */
export interface OptimalPathConfig<TSystem extends System>
  extends PathfindingStudy<TSystem> {
  /** Optional function to decide whether to add a node to the queue when a cheaper path exists */
  shouldReplace?: (existingCost: number, newCost: number) => boolean;
}

/**
 * Generic BFS implementation that can be extended for different search strategies.
 * @returns The optimal path (sequence of rule names) and total cost, or null if no path is found.
 */
export async function optimalPath<TSystem extends System>(
  config: OptimalPathConfig<TSystem>
): Promise<{ path: string[]; cost: number } | null> {
  const {
    system,
    initialState,
    targetCondition,
    codex,
    priorityFunction,
    shouldReplace = (existingCost, newCost) => newCost < existingCost,
  } = config;

  // Queue to store nodes to visit
  const queue: BFSNode<Shape<TSystem["schema"]>>[] = [];

  // A map to store the lowest cost found so far to reach a given state
  const visitedCosts = new Map<string, number>();

  // Create the start node and add it to the queue
  const startNode: BFSNode<Shape<TSystem["schema"]>> = {
    state: initialState,
    path: [],
    cost: 0,
  };

  queue.push(startNode);
  visitedCosts.set(await codex.encode(initialState), 0);

  // Queue management functions
  const enqueueNode = (node: BFSNode<Shape<TSystem["schema"]>>) => {
    if (priorityFunction) {
      insertNodeByPriority(queue, node, priorityFunction);
    } else {
      queue.push(node);
    }
  };

  const dequeueNode = (): BFSNode<Shape<TSystem["schema"]>> | undefined => {
    return queue.shift();
  };

  // Neighbor exploration function
  const exploreNeighbors = async (
    currentNode: BFSNode<Shape<TSystem["schema"]>>
  ) => {
    const currentStateHash = await codex.encode(currentNode.state);

    await generateNeighbors({
      system,
      currentState: { shape: currentNode.state, hash: currentStateHash },
      codex,
      visitedStates: visitedCosts,
      onTransition: async ({ result }) => {
        if (!result.systemState.hash) {
          throw new Error("Transition result has no hash");
        }

        const childNode = createChildNode(
          currentNode,
          result.ruleName,
          result.systemState.shape,
          result.cost
        );

        if (
          shouldAddNode(
            result.systemState.hash,
            childNode.cost,
            visitedCosts,
            shouldReplace
          )
        ) {
          visitedCosts.set(result.systemState.hash, childNode.cost);
          enqueueNode(childNode);
        }
      },
    });
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
 * Inserts a node into the queue based on priority function (lower priority = higher precedence)
 */
function insertNodeByPriority<TShape extends Shape<Schema>>(
  queue: BFSNode<TShape>[],
  node: BFSNode<TShape>,
  priorityFunction: (node: BFSNode<TShape>) => number
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
function createChildNode<TSchema extends Schema>(
  parentNode: BFSNode<Shape<TSchema>>,
  ruleName: string,
  newState: Shape<TSchema>,
  transitionCost: number
): BFSNode<Shape<TSchema>> {
  return {
    state: newState,
    path: [...parentNode.path, ruleName],
    cost: parentNode.cost + transitionCost,
  };
}
