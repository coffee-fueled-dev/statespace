# `@statespace/core`

A combinatorial state space explorer using Lehmer encoding and rule-based transitions.

This package provides the core logic for modeling systems as elements moving between containers, then efficiently exploring and generating possible states and transitions. It leverages Lehmer encoding for compact state representation and offers flexible transition generation based on user-defined rules and position handlers.

---

## Overview

The `@statespace/core` package is designed to help you model dynamic systems and explore their possible configurations. At its heart, it treats a system's state as an arrangement of **elements** within various **containers**. By defining rules for how elements can move between these containers, the framework can efficiently encode and decode system states and generate all valid transitions. This makes it a powerful tool for analyzing reachability, discovering optimal paths, and understanding overall system behavior.

---

## Core API

The `@statespace/core` package exports several key functions and types for building and exploring your state spaces.

### Functions

```typescript
import {
  encode,
  decode,
  transitionEngines,
  permutationToInternalState,
  logSpaceEstimates,
  parseYamlFromFile,
} from "@statespace/core";
```

- **`encode(permutation, elementBank, containers?)`**: Converts a given system `permutation` (an array of elements in a specific order) into its unique `lexicalIndex` (a number). An `elementBank` is required to define the set of all possible elements. Optionally, `containers` can be provided to automatically pad the element bank if the total number of slots across containers exceeds the initial `elementBank` length.
- **`decode(index, elementBank, containers?)`**: The inverse of `encode`. This function takes a `lexicalIndex` and an `elementBank` to reconstruct the original system `permutation`. Similar to `encode`, `containers` can be provided for correct padding if the system involves empty slots.
- **`permutationToInternalState(permutation, containers)`**: Transforms a flat `permutation` array into a structured `InternalSystemState` object, distributing elements into their respective containers based on the provided `containers` configuration. This is useful for working with states in a more human-readable and rule-processable format.
- **`transitionEngines.breadthFirst(state, encodeState, positionHandlers, getTransitionType?)`**: Generates **all** possible transitions from a given `state`. This function returns an array of `StateTransition` objects. It's suitable for exploring smaller state spaces or when you need a complete list of immediate next states.
- **`transitionEngines.depthFirst(state, encodeState, positionHandlers, getTransitionType?)`**: Generates transitions lazily as an iterable. This is ideal for very large state spaces where generating all transitions at once might be memory-intensive. It allows for depth-first traversal strategies.
- **`logSpaceEstimates(config)`**: A utility function that prints an estimated upper bound of the combinatorial state space for a given `StatespaceConfig` to the console. It provides a quick way to gauge the potential size of your state space before full exploration.
- **`parseYamlFromFile(path)`**: Loads and parses a system configuration from a YAML file, transforming it into a `StatespaceConfig` object.

### Types

```typescript
import type {
  StatespaceConfig,
  InternalSystemState,
  Element,
  Container,
  TransitionRule,
  StateTransition,
} from "@statespace/core";
```

- **`StatespaceConfig`**: Represents the overall configuration of your system, including its name, description, containers, and element bank.
- **`InternalSystemState`**: The internal representation of a system's state, used by the transition engines. It contains an array of `InternalContainer` objects.
- **`Element`**: A type alias for `string | boolean`, representing an item that can occupy a slot within a container. `false` typically signifies an empty slot.
- **`Container`**: Defines a container within your system, specifying its ID, number of slots, allowed transitions, and optional metadata and position handlers.
- **`TransitionRule`**: Describes a rule for moving elements from one container to another, including source and target container IDs, "from" and "to" positions (handled by `PositionHandler`s), an optional `transitionType`, `cost`, and `metadata`.
- **`StateTransition`**: Represents a single, valid move between two states in your system. It includes details about the element moved, source and target containers, transition type, the resulting system state, its lexical index, and any associated cost or metadata.

---

## Basic Usage

Here's a simple example demonstrating how to define a system, encode/decode states, and generate transitions using the core package:

```typescript
import {
  encode,
  decode,
  transitionEngines,
  permutationToInternalState,
  type InternalSystemState,
  type Element,
} from "@statespace/core";
// You'll need to install and import position handlers separately,
// e.g., from '@statespace/position-handlers'
import { start, end, any } from "@statespace/position-handlers";

// 1. Define your system configuration
const config = {
  elementBank: ["card1", "card2"], // All possible unique elements
  containers: [
    {
      id: "deck",
      slots: 3, // Deck can hold up to 3 cards
      allowedTransitions: [
        // Rule: draw a card from the start of the deck to any slot in the hand
        { targetId: "hand", from: "start", to: "any", transitionType: "DRAW" },
      ],
    },
    {
      id: "hand",
      slots: 2, // Hand can hold up to 2 cards
      allowedTransitions: [
        // Rule: return a card from any slot in the hand to the end of the deck
        { targetId: "deck", from: "any", to: "end", transitionType: "RETURN" },
      ],
    },
  ],
};

// 2. Provide position handlers (e.g., from the @statespace/position-handlers package)
const positionHandlers = { start, end, any };

// Helper functions for state conversion, using `encode` and `decode`
const getState = (index: number): InternalSystemState => {
  // Decode the lexical index to a permutation (flat list of elements)
  const permutation = decode(index, config.elementBank, config.containers);
  // Convert the permutation into a structured internal system state
  return permutationToInternalState(permutation, config.containers);
};

const encodeState = (state: InternalSystemState): number => {
  // Flatten the internal system state back into a permutation array
  const permutation: Element[] = [];
  state.containers.forEach((container) => {
    permutation.push(...container.slots);
  });
  // Encode the permutation back to a lexical index
  return encode(permutation, config.elementBank, config.containers);
};

// 3. Get an initial state (e.g., lexical index 0 often represents the initial sorted state)
const initialState = getState(0);
console.log("Initial State:", JSON.stringify(initialState, null, 2));

// 4. Generate transitions from the initial state using a transition engine
const transitions = transitionEngines.breadthFirst(
  initialState,
  encodeState,
  positionHandlers
);

console.log(
  `Generated ${transitions.length} transitions from the initial state:`
);
transitions.forEach((t) => {
  console.log(
    `- Move '${t.element}' from '${t.fromContainer}' to '${t.toContainer}' (Type: ${t.transitionType})`
  );
  console.log(`  Resulting state lexical index: ${t.lexicalIndex}`);
});
```

---

## YAML Configuration

You can define your system's structure using a YAML file and load it with `parseYamlFromFile`.

**`config.yaml` example:**

```yaml
name: "Simple System"
description: "A basic system with two containers and element movement."
containers:
  - id: "container_A"
    slots: 3
    transitions:
      - target: "container_B"
        from_position: "start" # Move from the start of container_A
        to_position: "any" # To any available slot in container_B
        action: "MOVE"
        metadata: { priority: high }
  - id: "container_B"
    slots: 2
    transitions:
      - target: "container_A"
        from_position: "any" # Move from any slot in container_B
        to_position: "end" # To the end of container_A
        action: "RETURN"
element_bank: ["item1", "item2"] # Elements available in the system
metadata: { version: "1.0" }
```

**Loading the YAML configuration:**

```typescript
import { parseYamlFromFile } from "@statespace/core";

async function loadConfig() {
  try {
    const config = await parseYamlFromFile("config.yaml");
    console.log("Loaded Configuration:", JSON.stringify(config, null, 2));
    // You can now use this 'config' object with other @statespace/core functions
  } catch (error) {
    console.error(error);
  }
}

loadConfig();
```

---

## Examples

For more comprehensive usage examples and demonstrations of specific features, explore the `examples/` directory in the monorepo:

- **`card-game/`**: A more complex example modeling a card game, including custom position handlers and transition logic.
- **`generic-system/`**: Demonstrates a basic container system with elements and built-in position handlers.
- **`persistence/`**: Illustrates integration with graph databases and queue processing for larger-scale state space exploration.

---
