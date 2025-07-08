import { Explorer } from "@statespace/core";
import { runExploration } from "@statespace/example-shared/runner";
import { cardgameMechanicsPlugin } from "../plugins/cardgame-mechanics";
import { cardGameYamlEquivalentConfig } from "./config";

async function main() {
  try {
    console.log("🔧 Setting up TypeScript multi-layer configuration...");
    console.log(`✅ Imported plugin: ${cardgameMechanicsPlugin.name}`);
    console.log(`✅ Loaded config: ${cardGameYamlEquivalentConfig.name}`);

    // Create the explorer with TypeScript config that uses the plugin
    const explorer = new Explorer(
      cardGameYamlEquivalentConfig.elementBank,
      cardGameYamlEquivalentConfig.containers,
      { transitionEngine: cardGameYamlEquivalentConfig.transitionEngine }
    );

    console.log(`✅ System built with imported plugin integration`);

    await runExploration({
      name: cardGameYamlEquivalentConfig.name,
      description: `${cardGameYamlEquivalentConfig.description} (TypeScript Multi-layer: Config + Plugin)`,
      icon: "🎯",
      explorer,
      elementBank: cardGameYamlEquivalentConfig.elementBank,
      containerCount: cardGameYamlEquivalentConfig.containers.length,
      customSetupInfo: () => {
        console.log("\n📋 Container Setup:");
        cardGameYamlEquivalentConfig.containers.forEach((container) => {
          const elementCount = container.slots.filter(
            (slot) => slot !== false
          ).length;
          const totalSlots = container.slots.length;
          const containerType = container.metadata?.container_type || "unknown";
          console.log(
            `  ${container.id}: ${elementCount}/${totalSlots} slots filled (${containerType})`
          );
        });
      },
      customStats: () => {
        console.log(`\n🏗️  Configuration Layers Used:`);
        console.log(
          `  Layer 1 (TypeScript Config): ${cardGameYamlEquivalentConfig.name} - ${cardGameYamlEquivalentConfig.containers.length} containers`
        );
        console.log(
          `  Layer 2 (Imported Plugin): ${cardgameMechanicsPlugin.name} v${cardgameMechanicsPlugin.version}`
        );
        console.log(
          `  Layer 3 (Direct Integration): TypeScript imports and applies plugin`
        );
        console.log(`  Approach: Multi-layer but fully programmatic`);
      },
    });
  } catch (error) {
    console.error("❌ TypeScript multi-layer configuration failed:", error);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
