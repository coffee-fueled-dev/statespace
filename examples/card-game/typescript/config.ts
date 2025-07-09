import type { Container, StatespaceConfig } from "@statespace/core";

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
    slots: 5,
    metadata: {
      container_type: "deck",
      type: "deck",
      faceDown: true,
    },
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
    slots: 3,
    metadata: {
      container_type: "hand",
      type: "hand",
      visible: true,
    },
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
    slots: 5,
    metadata: {
      container_type: "discard",
      type: "discard",
      faceUp: true,
    },
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
export const cardGameConfig: StatespaceConfig = {
  name: "Simple Card Game",
  description: "A basic card game with deck, hand, and discard pile",
  containers: cardGameContainers,
  elementBank: cardGameElementBank,
  metadata: {
    approach: "typescript-functional",
  },
};
