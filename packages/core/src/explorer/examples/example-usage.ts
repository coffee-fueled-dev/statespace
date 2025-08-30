import { Explorer } from "../explorer";
import { optimalPath } from "../studies/optimal-path";
import { anyPath } from "../studies/any-path";

/**
 * Example usage of the new runStudy method
 */
export async function exampleUsage<T extends object>(
  explorer: Explorer<T>,
  initialState: T,
  targetCondition: (state: T) => boolean
) {
  const limits = {
    maxIterations: 10000,
    maxStates: 50000,
  };

  // Run optimal path study using the unified interface
  console.log("Running optimal path study...");
  const optimalResult = await explorer.runStudy(
    (config) =>
      optimalPath({
        ...config,
        targetCondition,
        shouldReplace: (existing, newCost) => newCost < existing,
      }),
    { initialState, limit: limits }
  );

  if (optimalResult) {
    console.log(
      `Optimal path found with cost ${optimalResult.cost}:`,
      optimalResult.path
    );
    console.log(`States explored: ${explorer.stateCount}`);
  } else {
    console.log("No optimal path found");
  }

  // Reset and run DFS study
  console.log("\nRunning any path (DFS) study...");
  const anyResult = await explorer.runStudyWith(
    (config) =>
      anyPath({
        ...config,
        targetCondition,
        maxDepth: 100,
      }),
    initialState,
    { maxIterations: 5000, maxStates: 25000 }
  );

  if (anyResult) {
    console.log(`Any path found with cost ${anyResult.cost}:`, anyResult.path);
    console.log(`States explored: ${explorer.stateCount}`);
  } else {
    console.log("No path found");
  }

  // Example with custom priority function
  console.log("\nRunning guided optimal path study...");
  const guidedResult = await explorer.runStudy(
    (config) =>
      optimalPath({
        ...config,
        targetCondition,
        priorityFunction: (node) => node.cost + heuristic(node.state),
      }),
    { initialState, limit: limits }
  );

  return { optimalResult, anyResult, guidedResult };
}

// Example heuristic function (would be domain-specific)
function heuristic<T>(state: T): number {
  // This would be replaced with actual heuristic logic
  return 0;
}

/**
 * Example of running multiple studies in sequence
 */
export async function compareAlgorithms<T extends object>(
  explorer: Explorer<T>,
  initialState: T,
  targetCondition: (state: T) => boolean
) {
  const studies = [
    {
      name: "BFS (Optimal)",
      study: (config: any) => optimalPath({ ...config, targetCondition }),
    },
    {
      name: "DFS (Any Path)",
      study: (config: any) =>
        anyPath({ ...config, targetCondition, maxDepth: 50 }),
    },
    {
      name: "A* (Guided)",
      study: (config: any) =>
        optimalPath({
          ...config,
          targetCondition,
          priorityFunction: (node) => node.cost + heuristic(node.state),
        }),
    },
  ];

  const results = [];
  for (const { name, study } of studies) {
    console.log(`\n--- Running ${name} ---`);
    const startTime = Date.now();

    const result = await explorer.runStudyWith(study, initialState, {
      maxIterations: 10000,
      maxStates: 50000,
    });

    const duration = Date.now() - startTime;
    const statesExplored = explorer.stateCount;

    results.push({
      algorithm: name,
      result,
      duration,
      statesExplored,
      success: result !== null,
    });

    console.log(
      `Result: ${
        result ? `Found path (cost: ${result.cost})` : "No path found"
      }`
    );
    console.log(`Duration: ${duration}ms`);
    console.log(`States explored: ${statesExplored}`);
  }

  return results;
}
