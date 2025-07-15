# State Space Explorer

A configurable framework for generating and analyzing combinatorial state graphs. This project uses **Lehmer encoding** for efficient state representation and **rule-based transitions** to explore systems modeled as elements moving between containers.

---

## Work in Progress

Please note that this repository is currently a **work in progress**. While the core **bijective encoding** (Lehmer numbers) and **transitional rules engine** are intended to be robust, some advanced algorithms (e.g., in `@statespace/analysis`) and certain aspects of data persistence (e.g., duplication in graph edges for `@statespace/adapters/memgraph`) have not been extensively tested and may contain issues. Use at your own risk.

---

## What It Does

This framework helps you model dynamic systems to:

- **Explore possibilities**: Understand all reachable states and how to get there.
- **Find optimal paths**: Identify shortest routes between states.
- **Detect issues**: Locate dead ends or specific system configurations.
- **Analyze behavior**: Gain insights into system dynamics through automated exploration.

**Potential applications include:**

- Card game mechanics and balancing
- Logistics and workflow optimization
- Puzzle solving and game AI
- Process analysis and validation

---

## Quick Start

To get started, first install dependencies:

```bash
bun install
```

Then, try out an example:

```bash
# Run the card game example (TypeScript config)
bun run example:card-game:ts

# Run the generic system example (YAML config)
bun run example:generic-system:yaml

# Explore graph database persistence (requires Memgraph)
bun run example:persistence:memgraph

# Run a path search analysis
bun run example:card-game:bounded-path-search
```

---

## Project Structure

- **`packages/core/`**: The main framework, including encoding/decoding and transition engines.
- **`packages/adapters/`**: Integrations for graph databases (currently Memgraph).
- **`packages/analysis/`**: Advanced algorithms for graph exploration and analysis.
- **`packages/position-handlers/`**: Reusable logic for element placement within containers.
- **`examples/`**: Practical demonstrations of the framework's capabilities.
- **`docs/`**: Project documentation and goals.

---

## Getting Started

1.  **Explore the examples**: Look at the `examples/` directory to see how different systems are modeled.
2.  **Read the core README**: Understand the foundational concepts in `packages/core/README.md`.
3.  **Try graph persistence**: Run the Memgraph example (`bun run example:persistence:memgraph`) to see database integration.
4.  **Build your own system**: Use the examples as a starting point for your own state space exploration.

---

## Development

This project is built as a **Bun workspace** with **TypeScript**.

```bash
# Run tests across all packages
bun test

# Build all packages
bun run build

# Generate a plaintext dump of the codebase (respects .gitignore)
bun run context
```
