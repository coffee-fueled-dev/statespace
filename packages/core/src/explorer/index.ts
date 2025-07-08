import { Codec } from "../codec";
import {
  TransitionEngine,
  type TransitionEngineConfig,
} from "../transition-engine";
import type {
  Container,
  SystemState,
  LexicalIndex,
  StateTransition,
  Element,
} from "../types";

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

// Internal container format with actual slot arrays
interface InternalContainer {
  id: string;
  slots: Element[];
  metadata?: Record<string, any>;
  allowedTransitions: any[];
  positionHandlers?: any;
}

// Internal system state that works with slot arrays
interface InternalSystemState {
  containers: InternalContainer[];
}

/**
 * Explorer focuses on exploration logic and emits discovered states.
 */
export class Explorer {
  private codec: Codec;
  private containers: InternalContainer[];
  private transitionEngine: TransitionEngine;
  private totalSlots: number;
  private eventHandler?: ExplorerEventHandler;

  constructor(
    elementBank: string[],
    containerTemplates: Container[],
    config: ExplorerConfig = {}
  ) {
    // Convert containers to internal format and build full element bank
    const { internalContainers, fullElementBank } = this.processContainers(
      containerTemplates,
      elementBank
    );

    this.codec = new Codec(fullElementBank);
    this.containers = internalContainers;
    this.transitionEngine = new TransitionEngine(config.transitionEngine);
    this.totalSlots = this.containers.reduce(
      (sum, c) => sum + c.slots.length,
      0
    );
  }

  /**
   * Convert new Container format to internal format and build full element bank
   */
  private processContainers(
    containerTemplates: Container[],
    elementBank: string[]
  ): {
    internalContainers: InternalContainer[];
    fullElementBank: (string | boolean)[];
  } {
    const internalContainers: InternalContainer[] = containerTemplates.map(
      (template) => {
        // Create slots array filled with false (containers start empty)
        const slots: Element[] = new Array(template.slots).fill(false);

        return {
          id: template.id,
          slots,
          metadata: template.metadata,
          allowedTransitions: template.allowedTransitions,
          positionHandlers: template.positionHandlers,
        };
      }
    );

    // Calculate total slots and build full element bank with false values
    const totalSlots = internalContainers.reduce(
      (sum, container) => sum + container.slots.length,
      0
    );
    const falseSlots = Math.max(0, totalSlots - elementBank.length);
    const fullElementBank: (string | boolean)[] = [
      ...elementBank,
      ...Array(falseSlots).fill(false),
    ];

    return { internalContainers, fullElementBank };
  }

  /**
   * Set event handler for state and transition discovery
   */
  setEventHandler(handler: ExplorerEventHandler): void {
    this.eventHandler = handler;
  }

  /**
   * Explore a single state by its lexical index
   */
  singleState(index: LexicalIndex): ExplorationResult | undefined {
    const permutation = this.codec.decode(index);
    const systemState = this.toState(permutation);

    if (!systemState) {
      console.warn(`Could not configure state for index ${index}`);
      return undefined;
    }

    const transitions = this.transitionEngine.generateTransitions(
      systemState as any, // TODO: Fix types - TransitionEngine needs to be updated for new Container format
      (state: any) => {
        const flatState = this.toPermutation(state);
        return this.codec.encode(flatState);
      }
    );

    // Convert internal state to external SystemState format for events
    const externalState: SystemState = {
      containers: systemState.containers.map((container) => ({
        id: container.id,
        slots: container.slots.length,
        metadata: container.metadata,
        allowedTransitions: container.allowedTransitions,
        positionHandlers: container.positionHandlers,
      })),
    };

    // Emit state discovery event
    if (this.eventHandler?.onStateDiscovered) {
      this.eventHandler.onStateDiscovered({
        index,
        state: externalState,
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
      currentState: externalState,
      possibleTransitions: transitions,
    };
  }

  /**
   * Iterate through a range of state indices sequentially
   * Stateless operation - no tracking or path building
   */
  *iterateStates(
    startIndex: LexicalIndex,
    endIndex: LexicalIndex
  ): Generator<ExplorationResult> {
    for (
      let currentIndex = startIndex;
      currentIndex <= endIndex;
      currentIndex++
    ) {
      const result = this.singleState(currentIndex);
      if (result) {
        yield result;
      }
    }
  }

  /**
   * Convert a flat permutation into a structured internal system state
   */
  private toState(
    permutation: (string | boolean)[]
  ): InternalSystemState | undefined {
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
   * Convert a structured internal system state back to a flat permutation
   */
  private toPermutation(
    systemState: InternalSystemState
  ): (string | boolean)[] {
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
