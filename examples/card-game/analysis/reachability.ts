import { Explorer } from "@statespace/core";
import {
  AnalyticsEngine,
  displayBoundedPathSearchResult,
} from "@statespace/analysis";
import { cardGameConfig } from "../typescript/config";

/**
 * Simple goal search analysis: determine if target state is reachable from origin
 */
async function analyzeReachability(
  originIndex: number,
  targetIndex: number,
  stepLimit: number = 10
): Promise<void> {
  const explorer = new Explorer(
    cardGameConfig.elementBank,
    cardGameConfig.containers,
    { transitionEngine: cardGameConfig.transitionEngine }
  );

  const analytics = new AnalyticsEngine({
    explorer,
    autoTrackDiscoveries: true,
  });

  const result = await analytics.pathToTarget(originIndex, targetIndex, {
    stepLimit,
  });

  displayBoundedPathSearchResult(result, true);
}

// Example usage with different state indices
async function runExamples(): Promise<void> {
  console.log("🎴 Card Game Reachability Analysis\n");

  // Test several reachability scenarios
  await analyzeReachability(0, 5, 3); // Close indices, short limit
  await analyzeReachability(10, 50, 5); // Medium distance
  await analyzeReachability(0, 100, 10); // Longer distance
  await analyzeReachability(25, 25, 1); // Self-reachability
}

if (import.meta.main) {
  runExamples().catch(console.error);
}
