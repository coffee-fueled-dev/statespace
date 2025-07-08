import { Codec } from "./codec";
import {
  TransitionEngine,
  type TransitionEngineConfig,
} from "./transition-engine";
import type {
  Container,
  SystemState,
  LexicalIndex,
  StateTransition,
} from "./types";

export interface ExplorerConfig {
  transitionEngine?: TransitionEngineConfig;
}

export interface ExplorationOptions {
  seedIndex: number;
  limitIndex: number;
  elementBank: Element[];
}

export interface ExplorationResult {
  currentIndex: LexicalIndex;
  currentState: SystemState;
  possibleTransitions: StateTransition[];
}

// Event types for emission pattern
export interface StateDiscoveryEvent {
  index: LexicalIndex;
  state: SystemState;
  transitions: StateTransition[];
}

export interface TransitionDiscoveryEvent {
  fromIndex: LexicalIndex;
  toIndex: LexicalIndex;
  transition: StateTransition;
}

export type ExplorerEventHandler = {
  onStateDiscovered?: (event: StateDiscoveryEvent) => void;
  onTransitionDiscovered?: (event: TransitionDiscoveryEvent) => void;
};

/**
 * Explorer focuses on exploration logic and emits discovered states.
 */
export class Explorer {
  private codec: Codec;
  private containers: Container[];
  private transitionEngine: TransitionEngine;
  private totalSlots: number;
  private eventHandler?: ExplorerEventHandler;

  constructor(
    elementBank: (string | boolean)[],
    systemTemplate: Container[],
    config: ExplorerConfig = {}
  ) {
    this.codec = new Codec(elementBank);
    this.containers = systemTemplate.map((c) => ({ ...c }));
    this.transitionEngine = new TransitionEngine(config.transitionEngine);
    this.totalSlots = this.containers.reduce(
      (sum, c) => sum + c.slots.length,
      0
    );
  }

  /**
   * Set event handler for state and transition discovery
   */
  setEventHandler(handler: ExplorerEventHandler): void {
    this.eventHandler = handler;
  }

  /**
   * Explore the state space starting from a seed index up to a limit
   */
  async sequentialStates(
    options: ExplorationOptions
  ): Promise<ExplorationResult[]> {
    const { seedIndex, limitIndex } = options;
    const results: ExplorationResult[] = [];

    console.time("State space exploration");

    for (
      let currentIndex = seedIndex;
      currentIndex <= limitIndex;
      currentIndex++
    ) {
      const result = this.singleState(currentIndex);
      if (result) {
        results.push(result);
      }
    }

    console.timeEnd("State space exploration");
    return results;
  }

  /**
   * Explore a single state by its lexical index
   */
  singleState(index: LexicalIndex): ExplorationResult | undefined {
    const permutation = this.codec.decode(index);
    const systemState = this.permutationToState(permutation);

    if (!systemState) {
      console.warn(`Could not configure state for index ${index}`);
      return undefined;
    }

    const transitions = this.transitionEngine.generateTransitions(
      systemState,
      (state: SystemState) => {
        const flatState = this.stateToPermutation(state);
        return this.codec.encode(flatState);
      }
    );

    // Emit state discovery event
    if (this.eventHandler?.onStateDiscovered) {
      this.eventHandler.onStateDiscovered({
        index,
        state: systemState,
        transitions,
      });
    }

    // Emit transition discovery events
    if (this.eventHandler?.onTransitionDiscovered) {
      transitions.forEach((transition) => {
        this.eventHandler!.onTransitionDiscovered!({
          fromIndex: index,
          toIndex: transition.lexicalIndex,
          transition,
        });
      });
    }

    return {
      currentIndex: index,
      currentState: systemState,
      possibleTransitions: transitions,
    };
  }

  /**
   * Perform a breadth-first exploration starting from a seed state
   */
  async breadthFirst(
    seedIndex: LexicalIndex,
    maxNodes: number = 1000
  ): Promise<ExplorationResult[]> {
    const results: ExplorationResult[] = [];
    const visitedIndices = new Set<LexicalIndex>();
    const explorationQueue: LexicalIndex[] = [seedIndex];

    visitedIndices.add(seedIndex);

    console.time("Breadth-first exploration");

    while (explorationQueue.length > 0 && results.length < maxNodes) {
      const currentIndex = explorationQueue.shift()!;

      const result = this.singleState(currentIndex);
      if (result) {
        results.push(result);

        result.possibleTransitions.forEach((transition) => {
          if (!visitedIndices.has(transition.lexicalIndex)) {
            explorationQueue.push(transition.lexicalIndex);
            visitedIndices.add(transition.lexicalIndex);
          }
        });
      }
    }

    console.timeEnd("Breadth-first exploration");
    return results;
  }

  /**
   * Convert a flat permutation into a structured system state
   */
  private permutationToState(
    permutation: (string | boolean)[]
  ): SystemState | undefined {
    if (permutation.length !== this.totalSlots) {
      return undefined;
    }

    let offset = 0;
    const containers = this.containers.map((container) => {
      const slice = offset + container.slots.length;
      const slots = permutation.slice(offset, slice);
      offset = slice;

      return { ...container, slots };
    });

    return { containers };
  }

  /**
   * Convert a structured system state back to a flat permutation
   */
  private stateToPermutation(systemState: SystemState): (string | boolean)[] {
    return this.containers.flatMap((templateContainer) => {
      const configContainer = systemState.containers.find(
        (container) => container.id === templateContainer.id
      );
      return configContainer?.slots || [];
    });
  }

  /**
   * Get the codec instance for manual encoding/decoding
   */
  getCodec(): Codec {
    return this.codec;
  }

  /**
   * Get the transition engine for manual transition generation
   */
  getTransitionEngine(): TransitionEngine {
    return this.transitionEngine;
  }
}
