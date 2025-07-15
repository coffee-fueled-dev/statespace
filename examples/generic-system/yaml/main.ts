import { parseYamlFromFile } from "@statespace/core";
import { start, end, any } from "@statespace/position-handlers";
import { runExample } from "@statespace/example-shared/example-runner";

async function main() {
  const config = await parseYamlFromFile("./yaml/config.yaml");
  const positionHandlers = { start, end, any };
  const result = runExample(config, positionHandlers, 100);

  console.log("Generic System YAML Example Result:");
  console.log(`BF Transitions: ${result.bfTransitions.length}`);
  console.log("First DFS Transition:", result.firstDfTransition);
}

if (import.meta.main) {
  main().catch(console.error);
}
