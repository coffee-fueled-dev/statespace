import { Explorer } from "@statespace/core";
import { runExploration } from "@statespace/example-shared/runner";
import { genericSystemConfig } from "./config.js";

async function main() {
  const explorer = new Explorer(
    genericSystemConfig.elementBank,
    genericSystemConfig.containers,
    { transitionEngine: genericSystemConfig.transitionEngine }
  );

  await runExploration({
    name: genericSystemConfig.name,
    description: `${genericSystemConfig.description} (Pure TypeScript Configuration)`,
    icon: "⚙️",
    explorer,
    elementBank: genericSystemConfig.elementBank,
    containerCount: genericSystemConfig.containers.length,
    customSetupInfo: () => {
      console.log("\n📋 Container Setup:");
      genericSystemConfig.containers.forEach((container) => {
        const elementCount = container.slots.filter(
          (slot) => slot !== false
        ).length;
        const totalSlots = container.slots.length;
        const category = container.metadata?.category || "unknown";
        const type = container.metadata?.type || "container";
        console.log(
          `  ${container.id}: ${elementCount}/${totalSlots} slots filled (${type} - ${category})`
        );
      });
    },
    customStats: () => {
      console.log(`\n🏗️  Configuration Approach:`);
      console.log(`  TypeScript: Direct programmatic configuration`);
      console.log(`  Flexibility: Full access to TypeScript features`);
      console.log(
        `  Containers: ${genericSystemConfig.containers.length} with metadata`
      );
    },
  });
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}
