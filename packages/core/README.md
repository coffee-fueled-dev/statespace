# **State Space Explorer: Core Package (@statespace/core)**

## **📖 Overview**

The @statespace/core package is the foundational component of the State Space Explorer framework. It provides the essential tools for modeling dynamic systems, generating unique state representations, and defining the rules for transitions between them. This package is the engine that enables the exploration and analysis of combinatorial state graphs using efficient algorithms.

## **✨ Key Concepts**

- **Bijective Encoding:** At its heart, this library uses bijective encoding method to represent each unique system state as a compact, sortable integer or string. This is crucial for efficient state-space exploration, as it allows for fast lookups and avoids redundant computations for previously visited states.
- **Declarative Transition Rules:** The system's dynamics are defined by a set of declarative TransitionRule objects. Each rule contains a constraint (the preconditions for a state transition) and an effect (the resulting changes to the state).
- **Built-in Validation:** The library leverages zod for robust runtime validation, ensuring that every state change conforms to your defined schema, preventing invalid system configurations.
- **Efficient Search Algorithms:** The core provides implementations of BFS and a configurable A\* search to efficiently navigate the state graph and find optimal paths.

## **🔧 API Reference**

### **Algorithms**

These functions are the primary entry points for performing state-space searches and explorations.

- optimalPath(config: BFSConfig\<TSchema\>): Promise\<{ path: string\[\]; cost: number } | null\>  
  Finds the optimal path from an initial state to a target state. The search can be configured to act as a standard BFS or an A\* search by providing a priorityFunction. It returns an object containing the optimal path and total cost, or null if no path is found.
- expandRecursive(config: ExpansionConfig\<TSchema\>): Promise\<void\>  
  Recursively explores the state space from a given state, useful for generating a complete graph of all reachable states. It does not return a value but uses an onTransition callback to emit events as new states and transitions are discovered.
- mapStateSpace(config: StateSpaceExplorationConfig\<TSchema\>): Promise\<MarkovGraph\>  
  A higher-level function that generates a complete graph representation of the system's state space. It returns a Map where each key is a state, and the value is a record of all possible next states and the transitions that lead to them.

### **Transitions**

These are utility functions for working with individual transition rules.

- applyTransition(systemSchema, currentState, ruleName, rule): TransitionResult\<TSystem\>  
  Applies a single TransitionRule to a given state. It validates the constraints, applies the effect, and verifies the resulting state against the zod schema. It returns a TransitionResult object indicating success or failure.
- generateBreadth(systemSchema, currentState, transitionRules): TransitionSuccess\<TSystem\>\[\]  
  Iterates through all provided transitionRules and applies them to the current state. It returns an array of only the successful transition outcomes.

## **📦 Core Types**

These types are crucial for configuring and interacting with the APIs.

- **System\<TSchema\>**: Represents the system's state, inferred directly from your zod schema.
- **TransitionRule\<TSystem\>**: The core interface for a single state transition, including constraint, effect, and cost.
- **TransitionRules\<TSystem\>**: A record type for a collection of named TransitionRules.
- **BFSConfig\<TSchema\>**: The configuration object for the BFS search algorithm.
- **Codex\<T\>**: An interface for encoding a system state into a unique string key. This is the interface for implementing bijective encoding methods to ensure state keys are consistent and efficient.
- **TransitionResult\<TSystem\>**: A union type representing the outcome of applying a transition, which can be either a TransitionSuccess or TransitionFailure.
