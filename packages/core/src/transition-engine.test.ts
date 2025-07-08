import { test, expect, describe, beforeEach, mock } from "bun:test";
import {
  TransitionEngine,
  type TransitionEngineConfig,
} from "./transition-engine";
import type { SystemState, Container, Element, PositionHandler } from "./types";

// Internal types for testing the TransitionEngine
interface InternalContainer {
  id: string;
  slots: Element[];
  metadata?: Record<string, any>;
  allowedTransitions: any[];
  positionHandlers?: Record<string, PositionHandler>;
}

interface InternalSystemState {
  containers: InternalContainer[];
}

describe("TransitionEngine", () => {
  let engine: TransitionEngine;
  let mockEncodeState: ReturnType<typeof mock>;

  beforeEach(() => {
    engine = new TransitionEngine();
    mockEncodeState = mock((state: InternalSystemState) => {
      // Simple mock encoding based on container state
      return JSON.stringify(state).length;
    });
  });

  describe("Constructor and Configuration", () => {
    test("should create with default configuration", () => {
      const config = engine.getConfig();
      expect(config.defaultTransitionType).toBe("MOVE");
      expect(config.getTransitionType).toBeDefined();
      expect(config.positionHandlers).toBeDefined();
    });

    test("should accept custom configuration", () => {
      const customConfig: TransitionEngineConfig = {
        defaultTransitionType: "CUSTOM",
        getTransitionType: () => "SPECIAL",
      };

      const customEngine = new TransitionEngine(customConfig);
      const config = customEngine.getConfig();

      expect(config.defaultTransitionType).toBe("CUSTOM");
      expect(config.getTransitionType!("from", "to")).toBe("SPECIAL");
    });

    test("should update configuration", () => {
      engine.updateConfig({ defaultTransitionType: "UPDATED" });
      expect(engine.getConfig().defaultTransitionType).toBe("UPDATED");
    });
  });

  describe("Default Position Handlers", () => {
    test("should handle 'start' position correctly", () => {
      const startState: InternalSystemState = {
        containers: [
          {
            id: "deck",
            slots: ["ace", "king", false],
            allowedTransitions: [
              {
                targetId: "hand",
                from: "start",
                to: "any",
              },
            ],
          },
          {
            id: "hand",
            slots: [false, false, false],
            allowedTransitions: [],
          },
        ],
      };

      const transitions = engine.generateTransitions(
        startState,
        mockEncodeState
      );
      expect(transitions).toHaveLength(3); // Can move to any of 3 empty hand slots
      expect(transitions[0].element).toBe("ace");
      expect(transitions[0].fromContainer).toBe("deck");
      expect(transitions[0].toContainer).toBe("hand");
    });

    test("should handle 'end' position correctly", () => {
      const endState: InternalSystemState = {
        containers: [
          {
            id: "deck",
            slots: [false, "king", "ace"],
            allowedTransitions: [
              {
                targetId: "discard",
                from: "end",
                to: "end",
              },
            ],
          },
          {
            id: "discard",
            slots: [false, false, false],
            allowedTransitions: [],
          },
        ],
      };

      const transitions = engine.generateTransitions(endState, mockEncodeState);
      expect(transitions).toHaveLength(1);
      expect(transitions[0].element).toBe("ace");

      // Check the external SystemState format in the result
      const resultingState = transitions[0].resultingState;
      expect(resultingState.containers[0].slots).toBe(3); // Number of slots
      expect(resultingState.containers[1].slots).toBe(3); // Number of slots
    });

    test("should handle 'any' position correctly", () => {
      const anyState: InternalSystemState = {
        containers: [
          {
            id: "source",
            slots: ["card1", false, "card2"],
            allowedTransitions: [
              {
                targetId: "target",
                from: "any",
                to: "any",
              },
            ],
          },
          {
            id: "target",
            slots: [false, false],
            allowedTransitions: [],
          },
        ],
      };

      const transitions = engine.generateTransitions(anyState, mockEncodeState);
      // 2 cards can move to 2 empty slots = 4 transitions
      expect(transitions).toHaveLength(4);

      // Check that both cards can be moved
      const elements = transitions.map((t) => t.element);
      expect(elements).toContain("card1");
      expect(elements).toContain("card2");
    });
  });

  describe("Custom Position Handlers", () => {
    test("should use container-specific position handlers", () => {
      const customHandler: PositionHandler = {
        canMoveFrom: mock((slots: Element[]) => {
          // Custom logic: only move if exactly one card
          const cards = slots.filter((s) => typeof s === "string");
          if (cards.length === 1) {
            const index = slots.findIndex((s) => typeof s === "string");
            const newSlots = [...slots];
            newSlots[index] = false;
            return [{ element: cards[0], modifiedSlots: newSlots }];
          }
          return [];
        }),
        canMoveTo: mock((slots: Element[], element: Element) => {
          // Custom logic: only place in first empty slot
          const firstEmpty = slots.findIndex((s) => s === false);
          if (firstEmpty !== -1) {
            const newSlots = [...slots];
            newSlots[firstEmpty] = element;
            return [newSlots];
          }
          return [];
        }),
      };

      const customState: InternalSystemState = {
        containers: [
          {
            id: "custom",
            slots: ["onlyCard"],
            positionHandlers: { custom: customHandler },
            allowedTransitions: [
              {
                targetId: "target",
                from: "custom",
                to: "custom",
              },
            ],
          },
          {
            id: "target",
            slots: [false, false],
            positionHandlers: { custom: customHandler },
            allowedTransitions: [],
          },
        ],
      };

      const transitions = engine.generateTransitions(
        customState,
        mockEncodeState
      );
      expect(transitions).toHaveLength(1);
      expect(customHandler.canMoveFrom).toHaveBeenCalled();
      expect(customHandler.canMoveTo).toHaveBeenCalled();
    });

    test("should use global position handlers", () => {
      const globalHandler: PositionHandler = {
        canMoveFrom: mock(() => []),
        canMoveTo: mock(() => []),
      };

      engine.updateConfig({
        positionHandlers: { global: globalHandler },
      });

      const globalState: InternalSystemState = {
        containers: [
          {
            id: "source",
            slots: ["card"],
            allowedTransitions: [
              {
                targetId: "target",
                from: "global",
                to: "global",
              },
            ],
          },
          {
            id: "target",
            slots: [false],
            allowedTransitions: [],
          },
        ],
      };

      engine.generateTransitions(globalState, mockEncodeState);
      expect(globalHandler.canMoveFrom).toHaveBeenCalled();
    });
  });

  describe("Transition Type Logic", () => {
    test("should use rule-specified transition type", () => {
      const ruleEngine = new TransitionEngine({
        getTransitionType: (from, to, ruleTransitionType) => {
          if (ruleTransitionType) return ruleTransitionType;
          return "MOVE";
        },
      });

      const state: InternalSystemState = {
        containers: [
          {
            id: "deck",
            slots: ["card"],
            allowedTransitions: [
              {
                targetId: "hand",
                from: "start",
                to: "any",
                transitionType: "DRAW",
              },
            ],
          },
          {
            id: "hand",
            slots: [false],
            allowedTransitions: [],
          },
        ],
      };

      const transitions = ruleEngine.generateTransitions(
        state,
        mockEncodeState
      );
      expect(transitions).toHaveLength(1);
      expect(transitions[0].transitionType).toBe("DRAW");
    });

    test("should use custom transition type function", () => {
      const customEngine = new TransitionEngine({
        getTransitionType: (from, to, rule) => {
          if (from === "deck" && to === "hand") return "DEAL";
          return "MOVE";
        },
      });

      const state: InternalSystemState = {
        containers: [
          {
            id: "deck",
            slots: ["card"],
            allowedTransitions: [
              {
                targetId: "hand",
                from: "start",
                to: "any",
              },
            ],
          },
          {
            id: "hand",
            slots: [false],
            allowedTransitions: [],
          },
        ],
      };

      const transitions = customEngine.generateTransitions(
        state,
        mockEncodeState
      );
      expect(transitions[0].transitionType).toBe("DEAL");
    });

    test("should detect shift operations", () => {
      const engine = new TransitionEngine({
        getTransitionType: (from, to) => (from === to ? "SHIFT" : "MOVE"),
      });

      const state: InternalSystemState = {
        containers: [
          {
            id: "container",
            slots: ["card1", "card2", false],
            allowedTransitions: [
              {
                targetId: "container",
                from: "any",
                to: "any",
              },
            ],
          },
        ],
      };

      const transitions = engine.generateTransitions(state, mockEncodeState);
      expect(transitions.some((t) => t.transitionType === "SHIFT")).toBe(true);
    });
  });

  describe("State Validation", () => {
    test("should skip empty containers", () => {
      const emptyState: InternalSystemState = {
        containers: [
          {
            id: "empty",
            slots: [false, false, false],
            allowedTransitions: [
              {
                targetId: "target",
                from: "any",
                to: "any",
              },
            ],
          },
          {
            id: "target",
            slots: [false],
            allowedTransitions: [],
          },
        ],
      };

      const transitions = engine.generateTransitions(
        emptyState,
        mockEncodeState
      );
      expect(transitions).toHaveLength(0);
    });

    test("should skip transitions to full containers", () => {
      const fullTargetState: InternalSystemState = {
        containers: [
          {
            id: "source",
            slots: ["card"],
            allowedTransitions: [
              {
                targetId: "full",
                from: "start",
                to: "any",
              },
            ],
          },
          {
            id: "full",
            slots: ["card1", "card2"],
            allowedTransitions: [],
          },
        ],
      };

      const transitions = engine.generateTransitions(
        fullTargetState,
        mockEncodeState
      );
      expect(transitions).toHaveLength(0);
    });

    test("should skip transitions with no valid moves", () => {
      const noMovesState: InternalSystemState = {
        containers: [
          {
            id: "source",
            slots: [false, false],
            allowedTransitions: [
              {
                targetId: "target",
                from: "start", // start position with no cards
                to: "any",
              },
            ],
          },
          {
            id: "target",
            slots: [false],
            allowedTransitions: [],
          },
        ],
      };

      const transitions = engine.generateTransitions(
        noMovesState,
        mockEncodeState
      );
      expect(transitions).toHaveLength(0);
    });

    test("should handle missing target containers gracefully", () => {
      const missingTargetState: InternalSystemState = {
        containers: [
          {
            id: "source",
            slots: ["card"],
            allowedTransitions: [
              {
                targetId: "nonexistent",
                from: "start",
                to: "any",
              },
            ],
          },
        ],
      };

      expect(() =>
        engine.generateTransitions(missingTargetState, mockEncodeState)
      ).not.toThrow();

      const transitions = engine.generateTransitions(
        missingTargetState,
        mockEncodeState
      );
      expect(transitions).toHaveLength(0);
    });
  });

  describe("Complex Scenarios", () => {
    test("should handle multiple valid transitions from one state", () => {
      const complexState: InternalSystemState = {
        containers: [
          {
            id: "deck",
            slots: ["ace", "king"],
            allowedTransitions: [
              { targetId: "hand", from: "start", to: "any" },
              { targetId: "discard", from: "start", to: "end" },
            ],
          },
          {
            id: "hand",
            slots: [false, false],
            allowedTransitions: [],
          },
          {
            id: "discard",
            slots: [false, false],
            allowedTransitions: [],
          },
        ],
      };

      const transitions = engine.generateTransitions(
        complexState,
        mockEncodeState
      );
      // ace can go to: hand(2 slots) + discard(1 slot) = 3 transitions
      expect(transitions).toHaveLength(3);

      const toHand = transitions.filter((t) => t.toContainer === "hand");
      const toDiscard = transitions.filter((t) => t.toContainer === "discard");

      expect(toHand).toHaveLength(2);
      expect(toDiscard).toHaveLength(1);
    });

    test("should include metadata in transitions", () => {
      const metadataState: InternalSystemState = {
        containers: [
          {
            id: "source",
            slots: ["card"],
            allowedTransitions: [
              {
                targetId: "target",
                from: "start",
                to: "any",
                metadata: { cost: 1, description: "Draw card" },
              },
            ],
          },
          {
            id: "target",
            slots: [false],
            allowedTransitions: [],
          },
        ],
      };

      const transitions = engine.generateTransitions(
        metadataState,
        mockEncodeState
      );
      expect(transitions[0].metadata).toEqual({
        cost: 1,
        description: "Draw card",
      });
    });

    test("should generate correct resulting states in external format", () => {
      const initialState: InternalSystemState = {
        containers: [
          {
            id: "deck",
            slots: ["ace", false],
            allowedTransitions: [
              {
                targetId: "hand",
                from: "start",
                to: "start",
              },
            ],
          },
          {
            id: "hand",
            slots: [false, false],
            allowedTransitions: [],
          },
        ],
      };

      const transitions = engine.generateTransitions(
        initialState,
        mockEncodeState
      );
      expect(transitions).toHaveLength(1);

      const resultingState = transitions[0].resultingState;
      // External format should use the new Container API
      expect(resultingState.containers[0].slots).toBe(2); // Number of slots
      expect(resultingState.containers[1].slots).toBe(2); // Number of slots
      // Note: Element positions are determined by state index, not stored in containers
    });

    test("should call encodeState for each transition", () => {
      const state: InternalSystemState = {
        containers: [
          {
            id: "source",
            slots: ["card1", "card2"],
            allowedTransitions: [
              {
                targetId: "target",
                from: "any",
                to: "any",
              },
            ],
          },
          {
            id: "target",
            slots: [false, false],
            allowedTransitions: [],
          },
        ],
      };

      const transitions = engine.generateTransitions(state, mockEncodeState);
      expect(mockEncodeState).toHaveBeenCalledTimes(transitions.length);

      transitions.forEach((transition) => {
        expect(typeof transition.lexicalIndex).toBe("number");
      });
    });
  });

  describe("Performance and Edge Cases", () => {
    test("should handle large number of containers efficiently", () => {
      const containers = Array.from({ length: 10 }, (_, i) => ({
        id: `container${i}`,
        slots: i === 0 ? ["card"] : [false],
        allowedTransitions:
          i === 0
            ? [
                {
                  targetId: `container${i + 1}`,
                  from: "start",
                  to: "start",
                },
              ]
            : [],
      }));

      const largeState: InternalSystemState = { containers };

      const start = performance.now();
      const transitions = engine.generateTransitions(
        largeState,
        mockEncodeState
      );
      const duration = performance.now() - start;

      expect(transitions).toHaveLength(1);
      expect(duration).toBeLessThan(100); // Should be fast
    });

    test("should handle empty slots correctly", () => {
      const emptySlotState: InternalSystemState = {
        containers: [
          {
            id: "mixed",
            slots: ["card", false, "card2", false],
            allowedTransitions: [
              {
                targetId: "target",
                from: "any",
                to: "any",
              },
            ],
          },
          {
            id: "target",
            slots: [false],
            allowedTransitions: [],
          },
        ],
      };

      const transitions = engine.generateTransitions(
        emptySlotState,
        mockEncodeState
      );
      expect(transitions).toHaveLength(2); // Only 2 actual cards can move
      expect(transitions.every((t) => typeof t.element === "string")).toBe(
        true
      );
    });
  });
});
