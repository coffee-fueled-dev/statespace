import type {
  SystemState,
  Container,
  StateTransition,
  Element,
  PositionType,
  PositionHandler,
  TransitionType,
} from "./types";

export interface TransitionEngineConfig {
  // Function to determine transition type based on context
  getTransitionType?: (
    fromContainer: string,
    toContainer: string,
    rule?: any
  ) => TransitionType;
  defaultTransitionType?: TransitionType;
  positionHandlers?: Record<PositionType, PositionHandler>;
}

/**
 * TransitionEngine handles the generation of valid state transitions.
 */
export class TransitionEngine {
  private config: TransitionEngineConfig;

  constructor(config: TransitionEngineConfig = {}) {
    this.config = {
      defaultTransitionType: "MOVE",
      getTransitionType: (from, to, rule) => {
        if (rule?.transitionType) return rule.transitionType;
        if (from === to) return "SHIFT";
        return this.config.defaultTransitionType!;
      },
      positionHandlers: this.getDefaultPositionHandlers(),
      ...config,
    };
  }

  /**
   * Generate all valid transitions from the current state
   */
  generateTransitions(
    currentState: SystemState,
    encodeState: (state: SystemState) => number
  ): StateTransition[] {
    const transitions: StateTransition[] = [];

    for (const origin of currentState.containers) {
      // Skip empty containers
      if (origin.slots.every((slot) => slot === false)) continue;

      for (const rule of origin.allowedTransitions) {
        const target = currentState.containers.find(
          (c) => c.id === rule.targetId
        );
        if (!target) continue;

        // Get valid moves from origin
        const moves = this.getValidMoves(rule.from, origin);
        if (moves.length === 0) continue;

        // Check if target has space
        if (!target.slots.includes(false)) continue;

        // Generate transitions for each valid move
        for (const move of moves) {
          const placements = this.getValidPlacements(
            rule.to,
            target,
            move.element
          );

          for (const placement of placements) {
            const newContainers = this.createNewContainers(
              currentState.containers,
              origin.id,
              move.modifiedSlots,
              target.id,
              placement
            );

            const transitionType = this.config.getTransitionType!(
              origin.id,
              target.id,
              rule.transitionType
            );

            const lexicalIndex = encodeState({ containers: newContainers });

            transitions.push({
              element: move.element,
              fromContainer: origin.id,
              toContainer: target.id,
              transitionType,
              resultingState: { containers: newContainers },
              lexicalIndex,
              metadata: rule.metadata,
            });
          }
        }
      }
    }

    return transitions;
  }

  /**
   * Get valid moves from a container based on position
   */
  private getValidMoves(
    position: string,
    container: Container
  ): { element: Element; modifiedSlots: Element[] }[] {
    const handler = this.getPositionHandler(position, container);
    return handler ? handler.canMoveFrom(container.slots) : [];
  }

  /**
   * Get valid placements in a container based on position
   */
  private getValidPlacements(
    position: string,
    container: Container,
    element: Element
  ): Element[][] {
    const handler = this.getPositionHandler(position, container);
    return handler ? handler.canMoveTo(container.slots, element) : [];
  }

  /**
   * Create new container configuration after a move
   */
  private createNewContainers(
    containers: Container[],
    originId: string,
    newOriginSlots: Element[],
    targetId: string,
    newTargetSlots: Element[]
  ): Container[] {
    return containers.map((container) => {
      if (container.id === originId) {
        return { ...container, slots: newOriginSlots };
      }
      if (container.id === targetId) {
        return { ...container, slots: newTargetSlots };
      }
      return container;
    });
  }

  /**
   * Get position handler with hierarchy: container-specific -> global -> default
   */
  private getPositionHandler(
    position: string,
    container: Container
  ): PositionHandler | null {
    // 1. Check container-specific handlers first
    if (container.positionHandlers?.[position]) {
      return container.positionHandlers[position];
    }

    // 2. Check global handlers
    if (this.config.positionHandlers?.[position]) {
      return this.config.positionHandlers[position];
    }

    // 3. Check default handlers
    const defaultHandlers = this.getDefaultPositionHandlers();
    if (defaultHandlers[position]) {
      return defaultHandlers[position];
    }

    return null;
  }

  /**
   * Get default position handlers for common position types
   */
  private getDefaultPositionHandlers(): Record<string, PositionHandler> {
    return {
      start: {
        canMoveFrom: (slots: Element[]) => {
          const element = slots[0];
          if (typeof element === "boolean") return [];
          return [{ element, modifiedSlots: [false, ...slots.slice(1)] }];
        },
        canMoveTo: (slots: Element[], element: Element) => {
          return slots[0] === false ? [[element, ...slots.slice(1)]] : [];
        },
      },
      end: {
        canMoveFrom: (slots: Element[]) => {
          const element = slots[slots.length - 1];
          if (typeof element === "boolean") return [];
          return [{ element, modifiedSlots: [...slots.slice(0, -1), false] }];
        },
        canMoveTo: (slots: Element[], element: Element) => {
          const lastIndex = slots.length - 1;
          return slots[lastIndex] === false
            ? [[...slots.slice(0, lastIndex), element]]
            : [];
        },
      },
      any: {
        canMoveFrom: (slots: Element[]) => {
          const moves: { element: Element; modifiedSlots: Element[] }[] = [];

          for (let i = 0; i < slots.length; i++) {
            if (typeof slots[i] === "string") {
              const modifiedSlots = [...slots];
              modifiedSlots[i] = false;
              moves.push({ element: slots[i], modifiedSlots });
            }
          }

          return moves;
        },
        canMoveTo: (slots: Element[], element: Element) => {
          const placements: Element[][] = [];

          for (let i = 0; i < slots.length; i++) {
            if (slots[i] === false) {
              const newSlots = [...slots];
              newSlots[i] = element;
              placements.push(newSlots);
            }
          }

          return placements;
        },
      },
    };
  }

  /**
   * Update the engine configuration
   */
  updateConfig(config: Partial<TransitionEngineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): TransitionEngineConfig {
    return { ...this.config };
  }
}
