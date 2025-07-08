# State Space Explorer

A configurable combinatorial state space explorer that uses Lehmer encoding and rule-based transitions to generate and analyze permutation-driven state graphs.

## What is this?

Model your system as elements moving between containers, then explore what's possible. Find shortest paths, detect dead ends, count reachable states, and answer questions about your system's behavior through automated exploration.

**Common use cases:**

- Card game mechanics and balancing
- Logistics and workflow optimization
- Puzzle solving and game AI
- Process analysis and validation
- Combinatorial problem exploration

## Quick Start

```bash
# Install dependencies
bun install

# Try the card game example
bun run example:card-game:ts

# Try the generic system example
bun run example:generic-system:yaml

# Run analysis tools
bun run example:card-game:reachability
bun run example:card-game:goal-search
```

## Project Structure

- **`packages/core/`** - Main framework implementation
- **`examples/card-game/`** - Card game with custom position handlers
- **`examples/generic-system/`** - Basic container system using framework defaults
- **`docs/`** - Project documentation and goals

## Examples

### Card Game

Demonstrates custom position handlers (deck top/bottom, hand middle, discard stack) with both YAML and TypeScript configuration approaches.

### Generic System

Shows a basic container network using built-in position handlers (`any`, `start`, `end`) for simple element movement.

Both examples include analysis tools for exploring reachability, finding paths, and understanding system behavior.

## Framework Features

- **Multiple configuration formats** - YAML, TypeScript, or programmatic setup
- **Built-in position handlers** - Standard movement patterns included
- **Custom position logic** - Plugin system for domain-specific behaviors
- **Efficient exploration** - Optimized for large state spaces
- **Analysis tools** - Path finding, reachability analysis, system validation

## Getting Started

1. **Explore the examples** - See how different systems are modeled
2. **Read the core README** - Understand the framework concepts (`packages/core/README.md`)
3. **Try the analysis tools** - Run reachability and goal-search analysis
4. **Build your own system** - Start with a simple container setup

## Development

This is a Bun workspace with TypeScript throughout. Each package and example is self-contained with its own README and usage instructions.

```bash
# Run tests
bun test

# Build packages
bun run build

# Generate project context
bun run context
```
