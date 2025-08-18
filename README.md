# State Space Explorer

A configurable framework for generating and analyzing combinatorial state graphs. This project uses **rule-based transitions** to explore systems modeled as elements moving between containers.

---

## Work in Progress

Please note that this repository is currently a **work in progress**.

---

## What It Does

This framework helps you model dynamic systems to:

- **Find optimal paths**: Identify shortest routes between states.
- **Detect issues**: Locate dead ends or specific system configurations.
- **Analyze behavior**: Gain insights into system dynamics through automated exploration.

**Current examples demonstrate:**

- **Shopping workflows**: E-commerce state transitions and optimal paths
- **Classic puzzles**: Tower of Hanoi solver with complete state space analysis
- **API modeling**: Frontend/backend communication patterns and data flow
- **Graph exploration**: Combinatorial state space growth and branching analysis

**Potential applications include:**

- Card game mechanics and balancing
- Logistics and workflow optimization
- Puzzle solving and game AI
- Process analysis and validation
- API workflow testing and optimization

---

## Quick Start

To get started, first install dependencies:

```bash
bun install
```

Then, try out the examples:

```bash
# Tower of Hanoi: Classic puzzle solver using BFS
bun run example:hanoi:bfs

# Tower of Hanoi: Explore the complete state space and analyze growth patterns
bun run example:hanoi:explore

# API Workflow: Find the optimal path to an application state using the JSON Placeholder API
bun run example:api:bfs

# API Workflow: Explore the state space to configured limits and analyze available actions at various states
bun run example:api:explore
```

---

## Project Structure

- **`packages/core/`**: The main framework with simplified API for state space exploration
  - BFS algorithms for optimal pathfinding
  - State space mapping and analysis tools
  - Zod-based type-safe state modeling
  - Transition rules with constraints and effects
- **`packages/core/examples/`**: Practical demonstrations of the framework's capabilities
  - Shopping system workflow optimization
  - Tower of Hanoi puzzle solving and analysis
  - API frontend/backend communication modeling

---

## Getting Started

1. **Try the examples**: Run the example commands above to see different types of state space exploration
2. **Read the core README**: Understand the foundational concepts in `packages/core/README.md`
3. **Explore the code**: Check out `packages/core/src/examples/` to see how systems are modeled
4. **Build your own**: Model your own state spaces with Zod schemas and transition rules

### Example Categories

- **Pathfinding**: Use BFS to find optimal routes
- **State Analysis**: Explore complete state spaces and analyze growth patterns
- **System Modeling**: Model complex interactions like API communication flows
- **Constraint Solving**: Define rules and constraints to guide valid transitions

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
