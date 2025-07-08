import type { Container } from "@statespace/core";
import { cardgameMechanicsPlugin } from "../plugins/cardgame-mechanics";

/**
 * Element bank - declares all non-false elements available in the system
 */
export const cardGameElementBank = [
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
];

/**
 * Container definitions using the clean structural API
 */
export const cardGameContainers: Container[] = [
  {
    id: "deck",
    slots: 5, // Number of slots
    metadata: {
      container_type: "deck",
      type: "deck",
      faceDown: true,
    },
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
    slots: 3, // Number of slots
    metadata: {
      container_type: "hand",
      type: "hand",
      visible: true,
    },
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
    slots: 5, // Number of slots
    metadata: {
      container_type: "discard",
      type: "discard",
      faceUp: true,
    },
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

/**
 * Complete configuration object
 */
export const cardGameConfig = {
  name: "Simple Card Game (TypeScript Multi-layer)",
  description:
    "A basic card game with deck, hand, and discard pile (TypeScript Multi-layer: Config + Plugin)",
  containers: cardGameContainers,
  elementBank: cardGameElementBank,
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
