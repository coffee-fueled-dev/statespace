import { logSpaceEstimates } from "@statespace/core";
import { runExample } from "@statespace/example-shared/example-runner";
import { cardGamePositionHandlers } from "../plugins/cardgame-mechanics";
import { config } from "./config";

async function main() {
  const result = runExample(config, cardGamePositionHandlers, 123);

  console.log("Card Game Example Result:");
  console.log(`BF Transitions: ${result.bfTransitions.length}`);
  console.log("First DFS Transition:", result.firstDfTransition);
}

if (import.meta.main) {
  logSpaceEstimates(config);
  main().catch(console.error);
}
