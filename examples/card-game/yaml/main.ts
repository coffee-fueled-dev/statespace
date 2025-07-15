import { parseYamlFromFile } from "@statespace/core";
import { runExample } from "@statespace/example-shared/example-runner";
import { cardGamePositionHandlers } from "../plugins/cardgame-mechanics";

async function main() {
  const config = await parseYamlFromFile("./yaml/config.yaml");
  const result = runExample(config, cardGamePositionHandlers, 456);

  console.log("Card Game YAML Example Result:");
  console.log(`BF Transitions: ${result.bfTransitions.length}`);
  console.log("First DFS Transition:", result.firstDfTransition);
}

if (import.meta.main) {
  main().catch(console.error);
}
