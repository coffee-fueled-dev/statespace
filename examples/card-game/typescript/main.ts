import { runExample } from "../../shared/example-runner.js";
import { cardGamePositionHandlers } from "../plugins/cardgame-mechanics.js";
import { cardGameConfig } from "./config.js";

async function main() {
  const result = runExample(cardGameConfig, cardGamePositionHandlers, 123);

  console.log("Card Game Example Result:");
  console.log(`BF Transitions: ${result.bfTransitions.length}`);
  console.log("First DFS Transition:", result.firstDfTransition);
}

if (import.meta.main) {
  main().catch(console.error);
}
