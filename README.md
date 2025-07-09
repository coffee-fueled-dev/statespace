# State Space Explorer

A configurable combinatorial state space explorer that uses Lehmer encoding and rule-based transitions to generate and analyze permutation-driven state graphs with advanced persistence and analysis capabilities.

## What is this?

Model your system as elements moving between containers, then explore what's possible. Find shortest paths, detect dead ends, count reachable states, persist exploration results, and answer questions about your system's behavior through automated exploration.

**Common use cases:**

- Card game mechanics and balancing
- Logistics and workflow optimization
- Puzzle solving and game AI
- Process analysis and validation
- Combinatorial problem exploration
- Graph database population for complex state analysis

## Quick Start

```bash
# Install dependencies
bun install

# Try the card game example
bun run example:card-game:ts

# Try the generic system example
bun run example:generic-system:yaml

# Persist state exploration to graph database
bun run example:persistence:memgraph

# Run analysis tools
bun run example:card-game:bounded-path-search
```

## Project Structure

- **`packages/core/`** - Main framework implementation with transition engines
- **`packages/adapters/`** - Database adapters (Memgraph, extensible to other graph DBs)
- **`packages/analysis/`** - Advanced analysis algorithms (BFS, DFS, graph expansion)
- **`packages/position-handlers/`** - Built-in and extensible position logic
- **`examples/card-game/`** - Card game with custom position handlers
- **`examples/generic-system/`** - Basic container system using framework defaults
- **`examples/persistence/`** - Graph database persistence with queue-based processing
- **`docs/`** - Project documentation and goals

## Examples

### Card Game

Demonstrates custom position handlers (deck top/bottom, hand middle, discard stack) with both YAML and TypeScript configuration approaches. Includes bounded path search analysis.

### Generic System

Shows a basic container network using built-in position handlers (`any`, `start`, `end`) for simple element movement.

### Persistence

Explores state spaces and persists results to a Memgraph database using:

- **Recursive graph expansion** - Intelligently discovers connected states rather than blind enumeration
- **Queue-based batch processing** - Asynchronous, concurrent database writes with retry logic
- **State space estimation** - Warns about large combinatorial spaces before exploration
- **Well-connected graphs** - Generates meaningful graph structures for analysis

All examples include analysis tools for exploring reachability, finding paths, and understanding system behavior.

## Framework Features

### Core Engine

- **Multiple configuration formats** - YAML, TypeScript, or programmatic setup
- **Efficient exploration** - Lehmer encoding for compact state representation
- **Transition engines** - Breadth-first and depth-first state generation
- **Built-in position handlers** - Standard movement patterns included
- **Custom position logic** - Plugin system for domain-specific behaviors

### Analysis & Persistence

- **Advanced graph algorithms** - Recursive expansion, bounded search, cycle detection
- **Database adapters** - Memgraph support with extensible adapter pattern
- **Queue-based processing** - Concurrent, fault-tolerant batch operations
- **State space analysis** - Combinatorial estimates and warnings
- **Reachability analysis** - Path finding and connectivity analysis

### Performance & Scalability

- **Configurable concurrency** - Parallel database operations with backpressure
- **Batch processing** - Efficient bulk operations with retry logic
- **Memory management** - Streaming processing for large state spaces
- **Progress tracking** - Real-time feedback on exploration progress

## Getting Started

1. **Explore the examples** - See how different systems are modeled
2. **Read the core README** - Understand the framework concepts (`packages/core/README.md`)
3. **Try graph persistence** - Run the Memgraph example to see database integration
4. **Run analysis tools** - Explore the advanced algorithms in the analysis package
5. **Build your own system** - Start with a simple container setup

## Development

This is a Bun workspace with TypeScript throughout. Each package and example is self-contained with its own README and usage instructions.

```bash
# Run tests
bun test

# Build packages
bun run build

# Generate project context
bun run context

# Run persistence example with graph database
bun run example:persistence:memgraph
```

## Recent Additions

- **Graph Database Integration** - Persistent state exploration with Memgraph
- **Recursive Graph Expansion** - Intelligent state discovery algorithms
- **Queue-Based Processing** - Asynchronous batch operations with concurrency control
- **State Space Estimation** - Combinatorial analysis before exploration
- **Advanced Analysis Package** - BFS/DFS algorithms, path finding, cycle detection
