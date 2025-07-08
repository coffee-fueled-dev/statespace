# Generic System Example

This example demonstrates **configuration without plugins** using the State Space Explorer framework. It shows how a generic container system can be configured using two different approaches while relying on the framework's built-in default position handlers.

## Overview

The generic system simulates a basic container network with:

- **Container A**: Large primary container (6 slots)
- **Containers B & C**: Small secondary containers (1 slot each)
- **Container D**: Transfer utility container (1 slot)
- **Container E**: Storage primary container (1 slot)

Both approaches use the framework's default position handlers (`any`, `start`, `end`) without requiring custom plugins.

## Configuration Approaches

### 1. YAML Configuration (`yaml/`)

**Best for**: Non-typescript-ecosystem, configuration files, declarative setup

```bash
bun run start:yaml
# or from root
bun run example:generic-system:yaml
```

**Features**:

- Pure YAML configuration file (`yaml/config.yaml`)
- No plugins required - uses framework defaults
- ConfigLoader handles system building
- Simple declarative approach

**Architecture**:

```
Layer 1: YAML Config     → Declarative container and transition definitions
Layer 2: ConfigLoader    → System integration with default handlers
Layer 3: Framework       → Built-in position handlers (any, start, end)
```

### 2. TypeScript Configuration (`typescript/`)

**Best for**: Programmatic control, type safety

```bash
bun run start:ts
# or from root
bun run example:generic-system:ts
```

**Features**:

- TypeScript configuration file (`typescript/config.ts`)
- Direct StateSpaceExplorer instantiation
- Full programmatic control and type safety
- No external dependencies

**Architecture**:

```
Layer 1: TypeScript Config → Programmatic container and transition definitions
Layer 2: Direct Integration → Direct StateSpaceExplorer instantiation
Layer 3: Framework         → Built-in position handlers (any, start, end)
```

## File Structure

```
examples/generic-system/
├── README.md                    # This file
├── package.json                 # Package configuration with dual scripts
├── yaml/
│   ├── main.ts                  # YAML approach entry point
│   └── config.yaml              # Declarative system configuration
└── typescript/
    ├── main.ts                  # TypeScript approach entry point
    └── config.ts                # Programmatic system configuration
```

## Default Position Handlers

Both approaches use the framework's built-in position handlers:

### Standard Positions

- **`any`**: Access any element in the container
- **`start`**: Access elements at the beginning of the container
- **`end`**: Access elements at the end of the container

### Transition Types

- `MOVE`: Standard movement between containers
- `SHIFT`: Movement within the same container

## System Configuration

### Containers

| Container     | Slots | Type     | Category  | Function        |
| ------------- | ----- | -------- | --------- | --------------- |
| `container_A` | 6     | large    | primary   | Main storage    |
| `container_B` | 1     | small    | secondary | Processing node |
| `container_C` | 1     | small    | secondary | Processing node |
| `container_D` | 1     | transfer | utility   | Transfer hub    |
| `container_E` | 1     | storage  | primary   | Final storage   |

### Element Bank

`["item_1", "item_2", "item_3", "item_4", "item_5", "item_6", "item_7"]`

### Transition Network

```
container_A ←→ container_B ←→ container_C
    ↕              ↕              ↕
container_E ←→ container_D ←→ container_D
```

## Example Output

```bash
⚙️ Running Generic System
📝 Basic generic container system with standard position types (Pure YAML Configuration)
📊 Exploring states from index 30 to 40

📋 Container Setup:
  container_A: 0/6 slots filled (large - primary)
  container_B: 0/1 slots filled (small - secondary)
  container_C: 0/1 slots filled (small - secondary)
  container_D: 0/1 slots filled (transfer - utility)
  container_E: 0/1 slots filled (storage - primary)

📋 Sample Transitions:
--- State 30 ---
Possible transitions: 45
Movements:
  ⚙️ item_1: container_A → container_B (MOVE)
  ⚙️ item_2: container_A → container_E (MOVE)

📊 Exploration Statistics:
  Total states: 11
  Total transitions: 495
  Transition types: { MOVE: 495 }
  Average transitions per state: 45.00

🏗️  Configuration Approach:
  YAML: Pure declarative configuration
  No plugins: Using default position handlers
  Simplicity: Easy to read and modify
  Containers: 5 with metadata
```

## Key Differences

| Aspect              | YAML Approach                      | TypeScript Approach                |
| ------------------- | ---------------------------------- | ---------------------------------- |
| **Configuration**   | Declarative YAML file              | Programmatic TypeScript            |
| **System Building** | ConfigLoader handles instantiation | Direct StateSpaceExplorer creation |
| **Type Safety**     | Runtime validation                 | Compile-time validation            |
| **Dependencies**    | ConfigLoader + YAML parser         | Core framework only                |
| **Flexibility**     | Limited to YAML capabilities       | Full TypeScript language features  |
| **Validation**      | Runtime via ConfigLoader           | Compile-time + runtime             |
| **Plugins**         | None (framework defaults)          | None (framework defaults)          |

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
bun run example:generic-system:yaml -s 5 -l 15

# TypeScript approach
bun run example:generic-system:ts --bfs
```

## When to Use This Example

### Choose YAML Approach When:

- You want simple configuration files
- No custom position logic is needed
- Working in non-TypeScript environments
- Rapid prototyping and experimentation
- Configuration by non-developers

### Choose TypeScript Approach When:

- You need compile-time type safety
- Working within TypeScript ecosystem
- Want direct framework integration
- Need programmatic configuration generation
- Building complex systems

## Learning Path

1. **Start with YAML** (`bun run start:yaml`) - Understand the basic container network
2. **Examine the config** (`yaml/config.yaml`) - See how transitions are defined
3. **Try TypeScript** (`bun run start:ts`) - Compare the programmatic approach
4. **Study the differences** - Compare `yaml/config.yaml` vs `typescript/config.ts`
5. **Experiment** - Modify containers and transitions to see the effects

## Comparison with Card Game Example

Unlike the card game example which uses custom plugins:

- **No custom position handlers** - Uses framework defaults (`any`, `start`, `end`)
- **Simpler architecture** - No plugin layer needed
- **Standard transitions** - Basic MOVE and SHIFT operations
- **Generic containers** - Not domain-specific like deck/hand/discard

This example demonstrates how the framework can be used effectively without plugins for systems that don't require specialized position logic.
