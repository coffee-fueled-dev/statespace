import { ConfigLoader } from "@statespace/core";
import { runExploration } from "@statespace/example-shared/runner";
import { cardgameMechanicsPlugin } from "../plugins/cardgame-mechanics";

async function main() {
  try {
    const configLoader = new ConfigLoader({
      plugins: [cardgameMechanicsPlugin],
    });
    const yamlConfig = await configLoader.loadYamlFromFile(
      "./yaml/config.yaml"
    );
    const explorer = await configLoader.buildSystem(yamlConfig);

    await runExploration({
      name: yamlConfig.name,
      description: `${yamlConfig.description} (Multi-layer: YAML + Plugin)`,
      icon: "🃏",
      explorer,
      elementBank: yamlConfig.element_bank,
      containerCount: yamlConfig.containers.length,
      customSetupInfo: () => {
        console.log("\n📋 Container Setup:");
        yamlConfig.containers.forEach((container) => {
          const initialCount = container.initial_elements?.length || 0;
          console.log(
            `  ${container.id}: ${initialCount}/${container.slots} slots filled (${container.container_type})`
          );
        });
      },
      customStats: () => {
        console.log(`\n🏗️  Configuration Layers Used:`);
        console.log(
          `  Layer 1 (YAML): ${yamlConfig.name} - ${yamlConfig.containers.length} containers`
        );
        console.log(
          `  Layer 2 (Plugin): ${cardgameMechanicsPlugin.name} v${cardgameMechanicsPlugin.version}`
        );
        console.log(
          `  Layer 3 (ConfigLoader): System integration and validation`
        );
      },
    });
  } catch (error) {
    console.error("❌ Multi-layer configuration failed:", error);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
