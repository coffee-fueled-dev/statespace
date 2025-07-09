# Card Game Example

A card game system demonstrating the State Space Explorer framework with custom position handlers.

## Overview

Simple card game with deck, hand, and discard pile. Uses custom `cardgame-mechanics` plugin for specialized position logic.

## Usage

```bash
# YAML configuration
bun run start:yaml

# TypeScript configuration
bun run start:ts

# Analysis tool
bun run start:bounded-path-search

# From root
bun run example:card-game:yaml
bun run example:card-game:ts
bun run example:card-game:bounded-path-search
```

## Configuration

### YAML Approach (`yaml/`)

- Declarative YAML configuration
- Uses `parseYamlFromFile()` from core
- Plugin imported in main.ts

### TypeScript Approach (`typescript/`)

- Programmatic configuration objects
- Direct plugin integration
- Type safety and IDE support

## System Structure

**Containers:**

- `deck`: 5 slots (draw from top, shuffle to bottom)
- `hand`: 3 slots (flexible access to any card)
- `discard`: 5 slots (stack placement)

**Elements:** `["ace", "king", "queen", "jack", "ten", "nine", "eight", "seven", "six", "five"]`

**Custom Position Handlers:**

- `top`/`bottom` (deck operations)
- `middle` (hand operations)
- `stack` (discard operations)

## Plugin: Card Game Mechanics

The `cardgame-mechanics.ts` plugin provides:

- **Deck positions**: `top`, `bottom`
- **Hand positions**: `middle` (flexible access)
- **Stack positions**: `stack` (LIFO placement)
- **Transition types**: `DRAW`, `DISCARD`, `SHUFFLE`

## Example Output

```bash
Card Game Example Result:
BF Transitions: 1
First DFS Transition: { element: 'ace', ... }
```

## Analysis Tool

The bounded path search demonstrates advanced analysis capabilities:

```bash
bun run start:bounded-path-search
```

Searches for paths between states with configurable limits and timeouts.

## When to Use

- **YAML**: Configuration files, simple setups
- **TypeScript**: Custom logic, type safety, programmatic control

This example shows how to create custom position handlers for domain-specific behavior beyond the framework's built-in handlers.
