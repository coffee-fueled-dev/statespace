import {
  Explorer,
  type StateDiscoveryEvent,
  type TransitionDiscoveryEvent,
} from "@statespace/core";
import { StateGraph } from "./graph";

export interface RunnerOptions {
  seed?: number;
  limit?: number;
  bfs?: boolean;
  bfsNodes?: number;
  help?: boolean;
}

export interface RunnerConfig {
  name: string;
  description: string;
  icon: string;
  explorer: Explorer;
  elementBank: any[];
  containerCount: number;
  customSetupInfo?: () => void;
  customStats?: (stats: any) => void;
}

// Parse command line arguments
export function parseArgs(): RunnerOptions {
  const args = process.argv.slice(2);
  const config: RunnerOptions = {
    seed: 30,
    limit: 40,
    bfs: false,
    bfsNodes: 20,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--seed":
      case "-s":
        config.seed = parseInt(args[++i]) || config.seed;
        break;
      case "--limit":
      case "-l":
        config.limit = parseInt(args[++i]) || config.limit;
        break;
      case "--bfs":
        config.bfs = true;
        break;
      case "--bfs-nodes":
        config.bfsNodes = parseInt(args[++i]) || config.bfsNodes;
        break;
      case "--help":
      case "-h":
        config.help = true;
        break;
    }
  }

  return config;
}

// Print usage information
export function printUsage(systemName: string, description: string) {
  console.log(`
${systemName}

${description}

Usage: bun run main.ts [options]

Options:
  -s, --seed <number>      Starting seed index (default: 30)
  -l, --limit <number>     Ending limit index (default: 40)
  --bfs                    Run breadth-first exploration instead
  --bfs-nodes <number>     Max nodes for BFS (default: 20)
  -h, --help               Show this help

Examples:
  bun run main.ts -s 10 -l 20
  bun run main.ts --bfs --bfs-nodes 50
`);
}

// Main runner function
export async function runExploration(config: RunnerConfig): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printUsage(`${config.icon} ${config.name}`, config.description);
    return;
  }

  console.log(`${config.icon} Running ${config.name}`);
  console.log(`📝 ${config.description}`);
  console.log(`📊 Exploring states from index ${args.seed} to ${args.limit}`);
  console.log(`🔢 Element bank: ${JSON.stringify(config.elementBank)}`);
  console.log(`📦 Number of containers: ${config.containerCount}`);

  // Custom setup info if provided
  if (config.customSetupInfo) {
    config.customSetupInfo();
  }

  // Create a graph to collect the exploration results
  const graph = new StateGraph();

  // Set up event handlers to capture exploration events
  config.explorer.setEventHandler({
    onStateDiscovered: (event: StateDiscoveryEvent) => {
      graph.addNode(event.index, event.state);
      graph.addTransitions(event.index, event.transitions);
      graph.markVisited(event.index);
    },
    onTransitionDiscovered: (event: TransitionDiscoveryEvent) => {
      // Transitions are already added via addTransitions, but we could add additional logic here
      // if needed for more complex graph operations
    },
  });

  try {
    let results;

    if (args.bfs) {
      // Perform breadth-first exploration
      console.log(
        `\n🌐 Performing breadth-first exploration from state ${args.seed}...`
      );
      results = await config.explorer.breadthFirst(args.seed!, args.bfsNodes!);
      console.log(`🔍 BFS discovered ${results.length} connected states`);
    } else {
      // Perform sequential exploration
      results = await config.explorer.sequentialStates({
        seedIndex: args.seed!,
        limitIndex: args.limit!,
        elementBank: config.elementBank,
      });
      console.log(`\n✅ Sequential exploration completed!`);
      console.log(`📈 Processed ${results.length} states`);
    }

    // Display sample results
    if (results.length > 0) {
      console.log("\n📋 Sample Transitions:");
      results.slice(0, 3).forEach((result) => {
        console.log(`\n--- State ${result.currentIndex} ---`);
        console.log(
          `Possible transitions: ${result.possibleTransitions.length}`
        );

        if (result.possibleTransitions.length > 0) {
          console.log("Movements:");
          result.possibleTransitions.slice(0, 5).forEach((transition) => {
            console.log(
              `  ${config.icon} ${transition.element}: ${transition.fromContainer} → ${transition.toContainer} (${transition.transitionType})`
            );
          });
        }
      });
    }

    // Show exploration statistics from the graph
    const stats = graph.getStats();
    console.log(`\n📊 Exploration Statistics:`);
    console.log(`  Total states: ${stats.totalNodes}`);
    console.log(`  Total transitions: ${stats.totalEdges}`);
    console.log(`  Transition types:`, stats.transitionTypes);
    console.log(
      `  Average transitions per state: ${stats.averageTransitionsPerNode.toFixed(
        2
      )}`
    );

    // Custom stats if provided
    if (config.customStats) {
      config.customStats(stats);
    }
  } catch (error) {
    console.error(`❌ ${config.name} exploration failed:`, error);
  }
}
