import { runExample } from "@statespace/example-shared/example-runner";
import { start, end, any } from "@statespace/position-handlers";
import { config } from "./config";
import { logSpaceEstimates } from "@statespace/core";

async function main() {
  const positionHandlers = { start, end, any };
  const result = runExample(config, positionHandlers, 42);

  console.log("Generic System Example Result:");
  console.log(`BF Transitions: ${result.bfTransitions.length}`);
  console.log("First DFS Transition:", result.firstDfTransition);
}

if (import.meta.main) {
  logSpaceEstimates(config);
  main().catch(console.error);
}
