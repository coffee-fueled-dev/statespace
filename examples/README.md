# Examples for `@statespace` Framework

This directory contains various examples demonstrating how to use the `@statespace/core` package and related modules to model and explore combinatorial state spaces. Each example highlights different aspects of the framework, from basic system configuration to advanced features like custom position handlers and persistence.

---

## Contents

You'll find the following examples, each in its own subdirectory with a dedicated `README.md` for detailed information:

- **`card-game/`**:
  Demonstrates modeling a simple card game with a deck, hand, and discard pile. This example showcases how to implement **custom position handlers** to define specific movement logic (e.g., drawing from the "top" of a deck, playing to the "middle" of a hand, stacking to a "discard" pile). It also includes an analysis tool for **bounded path searching**.

- **`generic-system/`**:
  A straightforward example of a generic container system. This is an excellent starting point for understanding the fundamental concepts of the `@statespace` framework using its **built-in position handlers** (`start`, `end`, `any`) and default transition behaviors, without needing custom plugins.

- **`persistence/`**:
  Illustrates how to persist discovered state transitions to an external graph database, specifically **Memgraph**. This example shows how to integrate `@statespace/core` with the `@statespace/adapters` package to store and manage your state space graph for further analysis or visualization. It also demonstrates **queue processing** for efficient database operations.

---

## Running the Examples

Each example has its own `package.json` with `scripts` to run its various components. You can execute them directly from their respective directories or from the root of the monorepo.

To run any example, navigate into its directory (e.g., `cd examples/card-game`) and use the `bun run` commands specified in its `README.md`. Alternatively, you can run them from the monorepo root using the prefixed commands (e.g., `bun run example:card-game:yaml`).

### General Steps:

1.  **Install dependencies**:

    ```bash
    bun install
    ```

    (Run this command from the root of the monorepo once to install all workspace dependencies.)

2.  **Navigate to an example directory** (optional but recommended for clarity):

    ```bash
    cd examples/card-game
    ```

3.  **Run the desired script** as listed in the example's `README.md`. For instance:

    ```bash
    bun run start:ts
    ```

---

## Why Explore These Examples?

- **Understand Core Concepts**: See `encode`, `decode`, and `transitionEngines` in action within practical scenarios.
- **Learn about Configuration**: Compare and contrast defining system configurations using both **TypeScript** (programmatic, type-safe) and **YAML** (declarative, easy to read).
- **Master Position Handlers**: Discover how to leverage built-in position handlers or create your own custom ones for highly specific system behaviors.
- **Advanced Analysis & Persistence**: Explore how to integrate the framework with external tools for state space analysis and persistence.

Dive in and start experimenting\!
