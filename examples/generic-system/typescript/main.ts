import { runExample } from "../../shared/example-runner.js";
import { start, end, any } from "@statespace/position-handlers";
import { genericSystemConfig } from "./config.js";

async function main() {
  const positionHandlers = { start, end, any };
  const result = runExample(genericSystemConfig, positionHandlers, 42);

  console.log("Generic System Example Result:");
  console.log(`BF Transitions: ${result.bfTransitions.length}`);
  console.log("First DFS Transition:", result.firstDfTransition);
}

if (import.meta.main) {
  main().catch(console.error);
}
