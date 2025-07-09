# @statespace/core

A combinatorial state space explorer using Lehmer encoding and rule-based transitions.

## Overview

Model systems as elements moving between containers, then explore what's possible. The framework efficiently encodes states and generates transitions to answer questions about reachability, paths, and system behavior.

## Core API

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

- **`encode(permutation, elementBank, containers)`** - Convert state to lexical index
- **`decode(index, elementBank, containers)`** - Convert lexical index to permutation
- **`permutationToInternalState(permutation, containers)`** - Convert permutation to structured state
- **`transitionEngines.breadthFirst(state, encodeState, positionHandlers)`** - Generate all transitions from a state
- **`transitionEngines.depthFirst(state, encodeState, positionHandlers)`** - Generate transitions lazily
- **`logSpaceEstimates(config)`** - Display combinatorial state space estimates
- **`parseYamlFromFile(path)`** - Load configuration from YAML

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

## Basic Usage

```typescript
import {
  encode,
  decode,
  transitionEngines,
  permutationToInternalState,
  type InternalSystemState,
  type Element,
} from "@statespace/core";
import { start, end, any } from "@statespace/position-handlers";

// Define your system
const config = {
  elementBank: ["card1", "card2"],
  containers: [
    {
      id: "deck",
      slots: 3,
      allowedTransitions: [
        { targetId: "hand", from: "start", to: "any", transitionType: "DRAW" },
      ],
    },
    {
      id: "hand",
      slots: 2,
      allowedTransitions: [
        { targetId: "deck", from: "any", to: "end", transitionType: "RETURN" },
      ],
    },
  ],
};

const positionHandlers = { start, end, any };

// Encode/decode states
const getState = (index: number) => {
  const permutation = decode(index, config.elementBank, config.containers);
  return permutationToInternalState(permutation, config.containers);
};

const encodeState = (state: InternalSystemState) => {
  const permutation: Element[] = [];
  state.containers.forEach((container) => {
    permutation.push(...container.slots);
  });
  return encode(permutation, config.elementBank, config.containers);
};

// Generate transitions
const state = getState(0);
const transitions = transitionEngines.breadthFirst(
  state,
  encodeState,
  positionHandlers
);
```

## YAML Configuration

```yaml
name: "Simple System"
containers:
  - id: "container_A"
    slots: 3
    transitions:
      - target: "container_B"
        from_position: "start"
        to_position: "any"
        action: "MOVE"
  - id: "container_B"
    slots: 2
    transitions:
      - target: "container_A"
        from_position: "any"
        to_position: "end"
        action: "RETURN"
element_bank: ["item1", "item2"]
```

```typescript
import { parseYamlFromFile } from "@statespace/core";

const config = await parseYamlFromFile("config.yaml");
```

## Examples

See the `examples/` directory for complete working systems:

- **`card-game/`** - Card game with custom position handlers
- **`generic-system/`** - Basic container system with built-in handlers
- **`persistence/`** - Graph database integration with queue processing
