import { ConfigLoader } from "@statespace/core";
import { runExploration } from "@statespace/example-shared/runner";

async function main() {
  try {
    const configLoader = new ConfigLoader();
    const yamlConfig = await configLoader.loadYamlFromFile(
      "./yaml/config.yaml"
    );
    const explorer = await configLoader.buildSystem(yamlConfig);

    await runExploration({
      name: yamlConfig.name,
      description: `${yamlConfig.description} (Pure YAML Configuration)`,
      icon: "⚙️",
      explorer,
      elementBank: yamlConfig.element_bank,
      containerCount: yamlConfig.containers.length,
      customSetupInfo: () => {
        console.log("\n📋 Container Setup:");
        yamlConfig.containers.forEach((container) => {
          const initialCount = container.initial_elements?.length || 0;
          const category = container.metadata?.category || "unknown";
          const type = container.metadata?.type || "container";
          console.log(
            `  ${container.id}: ${initialCount}/${container.slots} slots filled (${type} - ${category})`
          );
        });
      },
      customStats: () => {
        console.log(`\n🏗️  Configuration Approach:`);
        console.log(`  YAML: Pure declarative configuration`);
        console.log(`  No plugins: Using default position handlers`);
        console.log(`  Simplicity: Easy to read and modify`);
        console.log(
          `  Containers: ${yamlConfig.containers.length} with metadata`
        );
      },
    });
  } catch (error) {
    console.error("❌ YAML configuration failed:", error);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
