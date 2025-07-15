import type { Container, StatespaceConfig } from "@statespace/core";

/**
 * Example: Generic Container System
 * This demonstrates the basic framework with standard position types
 * and default transition behaviors.
 */

export const config: StatespaceConfig = {
  name: "Generic System",
  description: "Basic generic container system with standard position types",
  elements: [
    "item_1",
    "item_2",
    "item_3",
    "item_4",
    "item_5",
    "item_6",
    "item_7",
  ],
  containers: [
    {
      id: "container_A",
      slots: 6,
      metadata: { type: "large", category: "primary" },
      allowedTransitions: [
        { targetId: "container_B", to: "start", from: "any" },
        { targetId: "container_E", to: "any", from: "any" },
        { targetId: "container_C", to: "start", from: "any" },
        { targetId: "container_A", to: "any", from: "any" },
      ],
    },
    {
      id: "container_B",
      slots: 1,
      metadata: { type: "small", category: "secondary" },
      allowedTransitions: [
        { targetId: "container_C", to: "end", from: "any" },
        { targetId: "container_E", to: "any", from: "start" },
        { targetId: "container_D", to: "any", from: "any" },
        { targetId: "container_A", to: "any", from: "start" },
      ],
    },
    {
      id: "container_C",
      slots: 1,
      metadata: { type: "small", category: "secondary" },
      allowedTransitions: [
        { targetId: "container_B", to: "end", from: "any" },
        { targetId: "container_E", to: "any", from: "start" },
        { targetId: "container_D", to: "any", from: "any" },
        { targetId: "container_A", to: "any", from: "start" },
      ],
    },
    {
      id: "container_D",
      slots: 1,
      metadata: { type: "transfer", category: "utility" },
      allowedTransitions: [
        { targetId: "container_C", to: "end", from: "any" },
        { targetId: "container_B", to: "end", from: "any" },
      ],
    },
    {
      id: "container_E",
      slots: 1,
      metadata: { type: "storage", category: "primary" },
      allowedTransitions: [
        { targetId: "container_C", to: "start", from: "any" },
        { targetId: "container_B", to: "start", from: "any" },
        { targetId: "container_A", to: "any", from: "any" },
      ],
    },
  ],
};
