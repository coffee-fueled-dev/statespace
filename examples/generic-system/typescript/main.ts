import { Explorer } from "@statespace/core";
import { genericSystemConfig } from "./config.js";

async function main() {
  const explorer = new Explorer(
    genericSystemConfig.elementBank,
    genericSystemConfig.containers,
    { transitionEngine: genericSystemConfig.transitionEngine }
  );
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}
