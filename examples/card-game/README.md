# Card Game Example

This example demonstrates **multi-layer configuration** using the State Space Explorer framework. It shows how the same card game system can be configured using two different approaches while sharing the same underlying plugin.

## Overview

The card game simulates a simple card system with:

- **Deck**: Cards are drawn from the top, shuffled to the bottom
- **Hand**: Players can hold cards with flexible access
- **Discard Pile**: Cards are placed on top of the stack

Both approaches use the same `cardgame-mechanics` plugin that provides specialized position handlers for each container type.

## Configuration Approaches

### 1. YAML Configuration (`yaml/`)

**Best for**: Non-typescript-ecosystem, configuration files, declarative setup

```bash
bun run start:yaml
# or from root
bun run example:card-game:yaml
```

**Features**:

- Pure YAML configuration file (`yaml/config.yaml`)
- Plugin referenced by name (`position_plugin: "cardgame-mechanics"`)
- ConfigLoader handles plugin integration
- No programming knowledge required

**Architecture**:

```
Layer 1: YAML Config     → Declarative container and transition definitions
Layer 2: Plugin          → TypeScript plugin with position handlers
Layer 3: ConfigLoader    → System integration and validation
```

### 2. TypeScript Configuration (`typescript/`)

**Best for**: Programmatic control, type safety

```bash
bun run start:ts
# or from root
bun run example:card-game:ts
```

**Features**:

- TypeScript configuration file (`typescript/config.ts`)
- Direct plugin import and integration
- Full programmatic control and type safety
- Compile-time validation

**Architecture**:

```
Layer 1: TypeScript Config → Programmatic container and transition definitions
Layer 2: Imported Plugin   → Direct plugin import and application
Layer 3: Direct Integration → TypeScript handles plugin integration
```

## File Structure

```
examples/card-game/
├── README.md                    # This file
├── package.json                 # Package configuration with dual scripts
├── plugins/
│   └── cardgame-mechanics.ts    # Plugin implementation
├── yaml/
│   ├── main.ts                  # YAML approach entry point
│   ├── config.yaml              # Declarative system configuration
└── typescript/
    ├── main.ts                  # TypeScript approach entry point
    ├── config.ts                # Programmatic system configuration
```

## Plugin: Card Game Mechanics

Both approaches use the same `cardgame-mechanics` plugin that provides:

### Position Handlers

- **Deck Positions**:
  - `top`: Draw cards from the top of the deck
  - `bottom`: Shuffle cards to the bottom of the deck
- **Hand Positions**:
  - `middle`: Flexible access to any card in hand
- **Discard Positions**:
  - `stack`: Cards placed on top of the discard pile

### Transition Types

- `DRAW`: Deck → Hand
- `PLAY`: Hand → Field
- `DISCARD`: Any → Discard
- `SHUFFLE`: Discard → Deck

## System Configuration

### Containers

| Container | Slots | Initial Cards               | Position Handlers |
| --------- | ----- | --------------------------- | ----------------- |
| `deck`    | 5     | ace, king, queen, jack, ten | top, bottom       |
| `hand`    | 3     | empty                       | middle            |
| `discard` | 5     | empty                       | stack             |

### Element Bank

`["ace", "king", "queen", "jack", "ten", "nine", "eight", "seven", "six", "five"]`

## Example Output

```bash
🃏 Running Simple Card Game
📝 A basic card game with deck, hand, and discard pile (Multi-layer: YAML + Plugin)
📊 Exploring states from index 30 to 40

📋 Container Setup:
  deck: 5/5 slots filled (deck)
  hand: 0/3 slots filled (hand)
  discard: 0/5 slots filled (discard)

📋 Sample Transitions:
--- State 30 ---
Possible transitions: 1
Card movements:
  🃏 ace: deck → hand (DRAW)

📊 Exploration Statistics:
  Total states: 11
  Total transitions: 9
  Move types: { DRAW: 5, DISCARD: 4 }
  Average transitions per state: 0.82

🏗️  Configuration Layers Used:
  Layer 1 (YAML): Simple Card Game - 3 containers
  Layer 2 (Plugin): cardgame-mechanics v1.0.0
  Layer 3 (ConfigLoader): System integration and validation
```

## Key Differences

| Aspect                 | YAML Approach                              | TypeScript Approach               |
| ---------------------- | ------------------------------------------ | --------------------------------- |
| **Configuration**      | Declarative YAML file                      | Programmatic TypeScript           |
| **Plugin Integration** | Referenced by name, loaded by ConfigLoader | Direct import and application     |
| **Type Safety**        | Runtime validation                         | Compile-time validation           |
| **Flexibility**        | Limited to YAML capabilities               | Full TypeScript language features |
| **Validation**         | Runtime via ConfigLoader                   | Compile-time + runtime            |

## Usage Examples

### Quick Start

```bash
# Try the YAML approach
bun run start:yaml --help
bun run start:yaml -s 10 -l 20

# Try the TypeScript approach
bun run start:ts --help
bun run start:ts --bfs --bfs-nodes 50
```

### From Root Directory

```bash
# YAML approach
bun run example:card-game:yaml -s 5 -l 15

# TypeScript approach
bun run example:card-game:ts --bfs
```

## Learning Path

1. **Start with YAML** (`bun run start:yaml`) - Understand the basic system
2. **Examine the plugin** (`yaml/cardgame-mechanics.ts`) - See how position handlers work
3. **Try TypeScript** (`bun run start:ts`) - Compare the programmatic approach
4. **Study the differences** - Compare `yaml/config.yaml` vs `typescript/config.ts`

This example demonstrates how the same functionality can be achieved through different configuration paradigms, allowing users to choose the approach that best fits their needs and expertise level.
