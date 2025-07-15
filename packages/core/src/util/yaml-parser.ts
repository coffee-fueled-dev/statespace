import * as yaml from "js-yaml";
import type { StatespaceConfig, Container, TransitionRule } from "../types";

// YAML Configuration Schema
export interface YamlSystemConfig {
  name: string;
  description?: string;
  containers: YamlContainer[];
  element_bank: string[];
  metadata?: Record<string, any>;
}

export interface YamlContainer {
  id: string;
  slots: number;
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

/**
 * Parse YAML configuration from file
 */
export async function parseYamlFromFile(
  filePath: string
): Promise<StatespaceConfig> {
  try {
    const file = Bun.file(filePath);
    const fileContent = await file.text();
    const yamlConfig = yaml.load(fileContent) as YamlSystemConfig;
    return parseYamlConfig(yamlConfig);
  } catch (error) {
    throw new Error(`Failed to load YAML file "${filePath}": ${error}`);
  }
}

/**
 * Parse YAML configuration object into StatespaceConfig
 * Pure function with single responsibility: YAML -> StatespaceConfig
 */
export function parseYamlConfig(
  yamlConfig: YamlSystemConfig
): StatespaceConfig {
  // Validate basic structure
  if (!yamlConfig.name || !yamlConfig.containers || !yamlConfig.element_bank) {
    throw new Error(
      "Invalid YAML config: missing required fields (name, containers, element_bank)"
    );
  }

  // Convert YAML containers to framework containers
  const containers: Container[] = yamlConfig.containers.map((yamlContainer) => {
    // Convert transitions
    const allowedTransitions: TransitionRule[] = yamlContainer.transitions.map(
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
      // No position handlers - those are provided separately by users
    };
  });

  return {
    name: yamlConfig.name,
    description: yamlConfig.description || "",
    containers,
    elements: yamlConfig.element_bank,
    metadata: yamlConfig.metadata,
  };
}
