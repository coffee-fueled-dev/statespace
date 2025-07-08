import { ConfigLoader } from "@statespace/core";
import {
  AnalyticsEngine,
  displayBoundedPathSearchResult,
} from "@statespace/analysis";

const ORIGIN_INDEX = 0;
const TARGET_INDEX = 1;
const LIMIT = 10;

async function main() {
  try {
    const configLoader = new ConfigLoader({});
    const yamlConfig = await configLoader.loadYamlFromFile(
      "./yaml/config.yaml"
    );
    const explorer = await configLoader.buildSystem(yamlConfig);

    const analytics = new AnalyticsEngine({
      explorer,
      autoTrackDiscoveries: true,
    });

    const result = await analytics.pathToTarget(ORIGIN_INDEX, TARGET_INDEX, {
      stepLimit: LIMIT,
    });

    displayBoundedPathSearchResult(result, true);
  } catch (error) {
    console.error("❌ Multi-layer configuration failed:", error);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
