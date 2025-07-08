import type { Container, StatespaceConfig } from "@statespace/core";
import { cardgameMechanicsPlugin } from "../plugins/cardgame-mechanics";

/**
 * TypeScript equivalent of the YAML card game configuration
 * This demonstrates how to achieve the same multi-layer approach
 * but with TypeScript importing and using the plugin directly
 */

// Define containers that mirror the YAML configuration
export const cardGameYamlEquivalentContainers: Container[] = [
  {
    id: "deck",
    slots: ["ace", "king", "queen", "jack", "ten"],
    metadata: {
      container_type: "deck",
      type: "deck",
      faceDown: true,
    },
    // Apply the plugin's position handlers for deck type
    positionHandlers: cardgameMechanicsPlugin.containerTypes?.deck,
    allowedTransitions: [
      {
        targetId: "hand",
        from: "top",
        to: "middle",
        transitionType: "DRAW",
      },
    ],
  },
  {
    id: "hand",
    slots: [false, false, false],
    metadata: {
      container_type: "hand",
      type: "hand",
      visible: true,
    },
    // Apply the plugin's position handlers for hand type
    positionHandlers: cardgameMechanicsPlugin.containerTypes?.hand,
    allowedTransitions: [
      {
        targetId: "discard",
        from: "middle",
        to: "stack",
        transitionType: "DISCARD",
      },
    ],
  },
  {
    id: "discard",
    slots: [false, false, false, false, false],
    metadata: {
      container_type: "discard",
      type: "discard",
      faceUp: true,
    },
    // Apply the plugin's position handlers for discard type
    positionHandlers: cardgameMechanicsPlugin.containerTypes?.discard,
    allowedTransitions: [
      {
        targetId: "deck",
        from: "stack",
        to: "bottom",
        transitionType: "SHUFFLE",
      },
    ],
  },
];

// Element bank that mirrors the YAML configuration
export const cardGameYamlEquivalentElementBank = [
  "ace",
  "king",
  "queen",
  "jack",
  "ten",
  "nine",
  "eight",
  "seven",
  "six",
  "five",
  false,
  false,
  false,
];

// Export the complete configuration
export const cardGameYamlEquivalentConfig: StatespaceConfig = {
  name: "Simple Card Game (TypeScript Multi-layer)",
  description: "A basic card game with deck, hand, and discard pile",
  containers: cardGameYamlEquivalentContainers,
  elementBank: cardGameYamlEquivalentElementBank,
  transitionEngine: {
    defaultTransitionType: "MOVE",
    getTransitionType: cardgameMechanicsPlugin.getTransitionType,
  },
  metadata: {
    approach: "typescript-multi-layer",
    plugin: cardgameMechanicsPlugin.name,
    version: cardgameMechanicsPlugin.version,
  },
};
