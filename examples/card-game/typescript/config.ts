import type { Container, StatespaceConfig } from "@statespace/core";

export const config: StatespaceConfig = {
  name: "Simple Card Game",
  description: "A basic card game with deck, hand, and discard pile",
  metadata: {
    approach: "typescript-functional",
  },
  elements: [
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
  ],
  containers: [
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
  ],
};
