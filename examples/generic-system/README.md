# Generic System Example

A basic container system demonstrating the State Space Explorer framework using built-in position handlers.

## Overview

Simple container network with 5 containers and 7 elements. Uses framework defaults (`any`, `start`, `end`) without custom plugins.

## Usage

```bash
# YAML configuration
bun run start:yaml

# TypeScript configuration
bun run start:ts

# From root
bun run example:generic-system:yaml
bun run example:generic-system:ts
```

## Configuration

### YAML Approach (`yaml/`)

- Declarative YAML configuration
- Uses `parseYamlFromFile()` from core
- Simple setup for non-TypeScript environments

### TypeScript Approach (`typescript/`)

- Programmatic configuration objects
- Direct imports from core
- Type safety and IDE support

## System Structure

**Containers:**

- `container_A`: 6 slots (primary storage)
- `container_B`: 1 slot (processing)
- `container_C`: 1 slot (processing)
- `container_D`: 1 slot (transfer hub)
- `container_E`: 1 slot (final storage)

**Elements:** `["item_1", "item_2", "item_3", "item_4", "item_5", "item_6", "item_7"]`

**Position Handlers:** `start`, `end`, `any` (framework built-ins)

## Example Output

```bash
Generic System Example Result:
BF Transitions: 45
First DFS Transition: { element: 'item_1', ... }
```

## When to Use

- **YAML**: Configuration files, non-TypeScript projects, simple setups
- **TypeScript**: Type safety, IDE support, programmatic control

This example shows how to use the framework without custom plugins for systems that don't need specialized position logic.
