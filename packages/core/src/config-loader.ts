import * as yaml from "js-yaml";
import type { Container, PositionHandler, Element } from "./types";
import { Explorer } from "./explorer";
import type { TransitionEngineConfig } from "./transition-engine";

// YAML Configuration Schema
export interface YamlSystemConfig {
  name: string;
  description?: string;
  position_plugin?: string; // Optional plugin reference

  containers: YamlContainer[];
  element_bank: string[];

  // Optional global settings
  default_transition_type?: string;
  metadata?: Record<string, any>;
}

export interface YamlContainer {
  id: string;
  slots: number;
  container_type?: string; // Maps to plugin container type
  metadata?: Record<string, any>;

  transitions: YamlTransition[];
}

export interface YamlTransition {
  target: string;
  from_position: string;
  to_position: string;
  action?: string;
  metadata?: Record<string, any>;
}

// Plugin Interface
export interface PositionPlugin {
  name: string;

  // Container-type -> position -> handler mapping
  containerTypes?: Record<string, Record<string, PositionHandler>>;

  // Custom transition logic
  getTransitionType?: (from: string, to: string, action?: string) => string;

  // Plugin metadata
  description?: string;
  version?: string;
}

export interface ConfigLoaderOptions {
  plugins?: PositionPlugin[];
}

/**
 * ConfigLoader handles loading YAML configurations and building systems with plugins
 */
export class ConfigLoader {
  private availablePlugins: Map<string, PositionPlugin> = new Map();

  constructor(options: ConfigLoaderOptions = {}) {
    // Register provided plugins
    if (options.plugins) {
      options.plugins.forEach((plugin) => {
        this.availablePlugins.set(plugin.name, plugin);
      });
    }
  }

  /**
   * Register a plugin
   */
  registerPlugin(plugin: PositionPlugin): void {
    this.availablePlugins.set(plugin.name, plugin);
  }

  /**
   * Register multiple plugins
   */
  registerPlugins(plugins: PositionPlugin[]): void {
    plugins.forEach((plugin) => this.registerPlugin(plugin));
  }

  /**
   * Load a YAML configuration from file
   */
  async loadYamlFromFile(filePath: string): Promise<YamlSystemConfig> {
    try {
      const file = Bun.file(filePath);
      const fileContent = await file.text();
      const config = yaml.load(fileContent) as YamlSystemConfig;

      // Validate the loaded config
      return await this.loadYamlConfig(config);
    } catch (error) {
      throw new Error(`Failed to load YAML file "${filePath}": ${error}`);
    }
  }

  /**
   * Load a YAML configuration from object (for programmatic use)
   */
  async loadYamlConfig(config: YamlSystemConfig): Promise<YamlSystemConfig> {
    // Validate basic structure
    if (!config.name || !config.containers || !config.element_bank) {
      throw new Error("Invalid YAML config: missing required fields");
    }

    return config;
  }

  /**
   * Get a plugin by name
   */
  getPlugin(name: string): PositionPlugin | undefined {
    return this.availablePlugins.get(name);
  }

  /**
   * Build a StateSpaceExplorer from YAML configuration
   */
  async buildSystem(config: YamlSystemConfig): Promise<Explorer> {
    // Get plugin if specified
    let plugin: PositionPlugin | undefined;
    if (config.position_plugin) {
      plugin = this.getPlugin(config.position_plugin);
      if (!plugin) {
        throw new Error(
          `Plugin "${
            config.position_plugin
          }" not found. Available plugins: ${Array.from(
            this.availablePlugins.keys()
          ).join(", ")}`
        );
      }
    }

    // Convert YAML containers to framework containers
    const containers = this.convertContainers(config.containers, plugin);

    // Build element bank with proper false slots
    const fullElementBank = this.buildElementBank(
      config.element_bank,
      containers
    );

    // Build transition engine config
    const transitionEngineConfig = this.buildTransitionEngineConfig(
      config,
      plugin
    );

    // Create the explorer
    return new Explorer(config.element_bank, containers, {
      transitionEngine: transitionEngineConfig,
    });
  }

  /**
   * Convert YAML containers to framework containers
   */
  private convertContainers(
    yamlContainers: YamlContainer[],
    plugin?: PositionPlugin
  ): Container[] {
    return yamlContainers.map((yamlContainer) => {
      // Get position handlers for this container type
      const positionHandlers = this.getContainerPositionHandlers(
        yamlContainer.container_type,
        plugin
      );

      // Convert transitions
      const allowedTransitions = yamlContainer.transitions.map(
        (transition) => ({
          targetId: transition.target,
          from: transition.from_position,
          to: transition.to_position,
          transitionType: transition.action,
          metadata: transition.metadata,
        })
      );

      return {
        id: yamlContainer.id,
        slots: yamlContainer.slots,
        metadata: yamlContainer.metadata,
        allowedTransitions,
        positionHandlers,
      };
    });
  }

  /**
   * Get position handlers for a container type from plugin
   */
  private getContainerPositionHandlers(
    containerType: string | undefined,
    plugin?: PositionPlugin
  ): Record<string, PositionHandler> | undefined {
    if (!containerType || !plugin?.containerTypes) {
      return undefined;
    }

    return plugin.containerTypes[containerType];
  }

  /**
   * Build element bank with proper number of false slots
   */
  private buildElementBank(
    elements: string[],
    containers: Container[]
  ): (string | boolean)[] {
    const totalSlots = containers.reduce(
      (sum, container) => sum + container.slots,
      0
    );

    const falseSlots = Math.max(0, totalSlots - elements.length);
    return [...elements, ...Array(falseSlots).fill(false)];
  }

  /**
   * Build transition engine configuration
   */
  private buildTransitionEngineConfig(
    config: YamlSystemConfig,
    plugin?: PositionPlugin
  ): TransitionEngineConfig {
    return {
      defaultTransitionType: config.default_transition_type || "MOVE",
      getTransitionType:
        plugin?.getTransitionType ||
        ((from, to, rule) => {
          // Use rule-specific type if provided
          if (rule?.transitionType) return rule.transitionType;
          // Use self-move detection if available
          if (from === to) return "SHIFT";
          // Use default
          return config.default_transition_type || "MOVE";
        }),
      // No global position handlers - using container-specific ones
    };
  }

  /**
   * List available plugins
   */
  listAvailablePlugins(): string[] {
    return Array.from(this.availablePlugins.keys());
  }

  /**
   * Get all registered plugins
   */
  getRegisteredPlugins(): Map<string, PositionPlugin> {
    return new Map(this.availablePlugins);
  }

  /**
   * Clear all registered plugins
   */
  clearPlugins(): void {
    this.availablePlugins.clear();
  }
}
