import { jsonCodex } from "@statespace/core";
import { optimalPath } from "@statespace/core";

import { APISystem, exampleState, type API } from "./config";

const targetCondition = (state: API) => {
  return state.frontend.posts.length > 0 && !state.frontend.loading;
};

if (import.meta.main) {
  const result = await optimalPath({
    system: APISystem,
    initialState: exampleState,
    targetCondition,
    codex: jsonCodex<API>(),
  });

  if (result) {
    console.log("\n✅ Optimal workflow found!");
    console.log(`Total cost: ${result.cost}`);
    console.log("Sequence of actions:");
    result.path.forEach((action, i) => {
      console.log(`  ${i + 1}. ${action}`);
    });

    console.log("\n🔍 This shows the most efficient way to:");
    console.log("  • Set up backend data");
    console.log("  • Make API calls");
    console.log("  • Load data into the frontend");
    console.log("  • Handle the async loading states properly");
  } else {
    console.log("\n❌ No valid workflow found within the given constraints.");
  }
}
