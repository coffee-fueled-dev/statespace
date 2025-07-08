# @statespace/core

A configurable combinatorial state space explorer that uses Lehmer encoding and rule-based transitions to generate and analyze permutation-driven state graphs.

## Overview

Define your system's rules and starting conditions, then explore what's possible. Answer questions like:

- Can I reach a specific arrangement from my current state?
- What configurations are possible within 5 steps?
- Are there any dead-end states where the system gets stuck?
- What's the shortest path to achieve my goal?
- How many total states are reachable in my system?

The framework models problems as elements moving between containers, but works for any scenario where you need to understand the space of possible sequences or arrangements.

**Key Features:**

- **Container-based modeling** - Define systems as containers holding elements
- **Flexible transition rules** - Control how elements move between containers
- **Efficient state exploration** - Navigate large state spaces using optimized encoding
- **Event-driven architecture** - React to state discoveries in real-time
- **Multiple configuration formats** - Use TypeScript, YAML, or plugin-based setup

## Core Concepts

### Elements and Containers

**Elements** are the objects that move through your system - cards, packages, game pieces, or anything else:

```typescript
const elements = ["ace", "king", "queen", false]; // false = empty slot
```

**Containers** hold elements and define the structure of your system:

```typescript
const deck = {
  id: "deck",
  slots: ["ace", "king", "queen", false, false], // 5 slots, 3 filled
  allowedTransitions: [
    { targetId: "hand", from: "start", to: "any", transitionType: "DRAW" },
  ],
};
```

### State Space Exploration

Every arrangement of elements across containers represents a unique **state**. The framework lets you:

- **Navigate between states** by following transition rules
- **Search for specific arrangements** using path-finding algorithms
- **Analyze reachable states** from any starting configuration
- **Track state transitions** for debugging or visualization

## Quick Start

### Basic Card Game Example

```typescript
import { Explorer } from "@statespace/core";

// Define your system
const elementBank = ["ace", "king", "queen", false, false];

const containers = [
  {
    id: "deck",
    slots: ["ace", "king", "queen", false, false],
    allowedTransitions: [
      { targetId: "hand", from: "start", to: "any", transitionType: "DRAW" },
    ],
  },
  {
    id: "hand",
    slots: [false, false],
    allowedTransitions: [
      { targetId: "deck", from: "any", to: "end", transitionType: "RETURN" },
    ],
  },
];

// Create explorer
const explorer = new Explorer(elementBank, containers);

// Explore a specific state
const state = explorer.singleState(0);
console.log("Current state:", state.currentState);
console.log("Possible moves:", state.possibleTransitions);

// Find states reachable in 3 moves
const reachable = await explorer.breadthFirst(0, 100);
```

### Position-Based Movement

Control **where** elements can move within containers:

```typescript
const container = {
  id: "stack",
  slots: [false, false, false],
  allowedTransitions: [
    { targetId: "deck", from: "start", to: "any" }, // Only from top
    { targetId: "hand", from: "end", to: "start" }, // Only from bottom to top
  ],
};
```

**Built-in positions:**

- `"start"` - First available slot
- `"end"` - Last available slot
- `"any"` - Any available slot

## State Space Navigation

### Sequential Exploration

Explore states in order by their internal indices:

```typescript
const results = await explorer.sequentialStates({
  seedIndex: 0,
  limitIndex: 50,
  elementBank,
});

// Examine each discovered state
for (const result of results) {
  console.log(`State ${result.index}:`, result.currentState);
}
```

### Breadth-First Search

Follow transitions to find all reachable states:

```typescript
// Start from state 0, explore up to 1000 states
const bfsResults = await explorer.breadthFirst(0, 1000);
```

### Event-Driven Exploration

React to state discoveries in real-time:

```typescript
explorer.setEventHandler({
  onStateDiscovered: (event) => {
    console.log(`Found state ${event.index}`);
    console.log(`${event.transitions.length} transitions available`);

    // Store in database, update visualization, etc.
  },
});

await explorer.sequentialStates({ seedIndex: 0, limitIndex: 100, elementBank });
```

## Configuration Options

### TypeScript Configuration

Direct object configuration for maximum flexibility:

```typescript
const config = {
  elementBank: ["card1", "card2", false],
  containers: [
    /* ... */
  ],
  transitionEngine: {
    positionHandlers: {
      // Custom position logic
      middle: {
        canMoveFrom: (slots) => {
          /* ... */
        },
        canMoveTo: (slots, element) => {
          /* ... */
        },
      },
    },
  },
};

const explorer = new Explorer(config.elementBank, config.containers, config);
```

### YAML Configuration

Declarative configuration for simpler setups:

```yaml
name: "Card Game"
containers:
  - id: "deck"
    slots: 5
    initial_elements: ["ace", "king"]
    transitions:
      - target: "hand"
        from_position: "start"
        to_position: "any"
        action: "DRAW"

  - id: "hand"
    slots: 3
    transitions:
      - target: "deck"
        from_position: "any"
        to_position: "end"
        action: "RETURN"

element_bank: ["ace", "king", "queen", false, false, false, false, false]
```

```typescript
import { ConfigLoader } from "@statespace/core";

const loader = new ConfigLoader();
const config = await loader.loadYamlFromFile("game.yaml");
const explorer = await loader.buildSystem(config);
```

## Use Cases

### Game Development

- **Card games**: Model deck, hand, discard interactions
- **Board games**: Track piece positions and valid moves
- **Puzzles**: Explore solution paths and dead ends

### Logistics & Planning

- **Warehouse systems**: Model inventory movement between locations
- **Production lines**: Track items through manufacturing stages
- **Resource allocation**: Optimize distribution strategies

### Research & Analysis

- **State space analysis**: Study system properties and behaviors
- **Path finding**: Discover optimal or all possible routes
- **Simulation**: Model complex multi-step processes

## API Overview

### Explorer Class

The main interface for state space exploration:

```typescript
// Create explorer
const explorer = new Explorer(elementBank, containers, options?);

// Explore states
const state = explorer.singleState(index);                    // Single state
const results = await explorer.sequentialStates(options);     // Range of states
const reachable = await explorer.breadthFirst(seed, maxNodes); // BFS from seed

// Event handling
explorer.setEventHandler(handler);

// Access internals
const codec = explorer.getCodec();
const engine = explorer.getTransitionEngine();
```

### ConfigLoader Class

Load systems from YAML or other formats:

```typescript
const loader = new ConfigLoader(options?);
const config = await loader.loadYamlFromFile(path);
const explorer = await loader.buildSystem(config);
```

## Performance

The framework is optimized for large state spaces:

- **Lehmer encoding** provides efficient state representation
- **BitSet operations** optimize element tracking during transitions
- **Lazy evaluation** generates states only when needed
- **Event-driven design** separates exploration from storage

Typical performance: Handle millions of states with O(n log n) complexity for most operations.

## Examples

Explore the `examples/` directory for complete working systems:

- **`card-game/`** - Complete card game with analysis tools
- **`generic-system/`** - Basic container system without game-specific logic

## License

MIT
