import { test, expect, describe } from "bun:test";
import { breadthFirst } from "./breadth-first";
import type { InternalSystemState, TransitionType } from "../types";
import { start, end, any } from "@statespace/position-handlers";

describe("breadthFirst", () => {
  const mockEncodeState = (state: InternalSystemState): number => {
    return JSON.stringify(state.containers.map((c) => c.slots))
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  };

  const positionHandlers = { start, end, any };

  test("should return empty array when no transitions possible", () => {
    const state: InternalSystemState = {
      containers: [
        {
          id: "empty",
          slots: [false, false],
          allowedTransitions: [
            { targetId: "target", from: "start", to: "start" },
          ],
        },
        {
          id: "target",
          slots: [false],
          allowedTransitions: [],
        },
      ],
    };

    const result = breadthFirst(state, mockEncodeState, positionHandlers);
    expect(result).toEqual([]);
  });

  test("should generate basic transitions", () => {
    const state: InternalSystemState = {
      containers: [
        {
          id: "source",
          slots: ["a"],
          allowedTransitions: [
            { targetId: "target", from: "start", to: "start" },
          ],
        },
        {
          id: "target",
          slots: [false],
          allowedTransitions: [],
        },
      ],
    };

    const result = breadthFirst(state, mockEncodeState, positionHandlers);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      element: "a",
      fromContainer: "source",
      toContainer: "target",
      transitionType: "MOVE",
    });
    expect(result[0].resultingState.containers[0].slots).toBe(1);
    expect(result[0].lexicalIndex).toEqual(expect.any(Number));
  });

  test("should generate multiple transitions with 'any' position", () => {
    const state: InternalSystemState = {
      containers: [
        {
          id: "source",
          slots: ["x"],
          allowedTransitions: [{ targetId: "target", from: "any", to: "any" }],
        },
        {
          id: "target",
          slots: [false, false, false],
          allowedTransitions: [],
        },
      ],
    };

    const result = breadthFirst(state, mockEncodeState, positionHandlers);
    expect(result).toHaveLength(3); // 3 possible placements
  });

  test("should use custom transition types", () => {
    const state: InternalSystemState = {
      containers: [
        {
          id: "deck",
          slots: ["card"],
          allowedTransitions: [
            {
              targetId: "hand",
              from: "start",
              to: "start",
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

    const customGetType = (
      from: string,
      to: string,
      ruleTransitionType?: any
    ): TransitionType => ruleTransitionType || "MOVE";

    const result = breadthFirst(
      state,
      mockEncodeState,
      positionHandlers,
      customGetType
    );
    expect(result[0].transitionType).toBe("DRAW");
  });

  test("should preserve metadata", () => {
    const state: InternalSystemState = {
      containers: [
        {
          id: "source",
          slots: ["item"],
          allowedTransitions: [
            {
              targetId: "target",
              from: "start",
              to: "start",
              metadata: { cost: 5 },
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

    const result = breadthFirst(state, mockEncodeState, positionHandlers);
    expect(result[0].metadata).toEqual({ cost: 5 });
  });

  test("should handle complex multi-container scenarios", () => {
    const state: InternalSystemState = {
      containers: [
        {
          id: "deck",
          slots: ["ace", "king"],
          allowedTransitions: [{ targetId: "hand", from: "start", to: "any" }],
        },
        {
          id: "hand",
          slots: [false, false],
          allowedTransitions: [
            { targetId: "discard", from: "any", to: "start" },
          ],
        },
        {
          id: "discard",
          slots: [false],
          allowedTransitions: [],
        },
      ],
    };

    const result = breadthFirst(state, mockEncodeState, positionHandlers);

    expect(result.length).toBeGreaterThan(0);

    const drawMoves = result.filter((t) => t.fromContainer === "deck");
    expect(drawMoves.length).toBeGreaterThan(0); // Should have some moves

    const elements = new Set(drawMoves.map((t) => t.element));
    expect(elements.has("ace")).toBe(true); // Should include ace (first card at start position)
  });

  test("should evaluate static costs", () => {
    const state: InternalSystemState = {
      containers: [
        {
          id: "source",
          slots: ["item"],
          allowedTransitions: [
            {
              targetId: "target",
              from: "start",
              to: "start",
              cost: 5,
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

    const result = breadthFirst(state, mockEncodeState, positionHandlers);
    expect(result[0].cost).toBe(5);
  });

  test("should evaluate cost functions", () => {
    const state: InternalSystemState = {
      containers: [
        {
          id: "source",
          slots: ["expensive", "cheap"],
          allowedTransitions: [
            {
              targetId: "target",
              from: "any",
              to: "any",
              cost: (currentState) => {
                // Cost based on number of elements in source
                const sourceContainer = currentState.containers.find(
                  (c) => c.id === "source"
                );
                return sourceContainer
                  ? sourceContainer.slots.filter((s) => s !== false).length * 2
                  : 1;
              },
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

    const result = breadthFirst(state, mockEncodeState, positionHandlers);

    // Should evaluate cost function: 2 elements * 2 = 4
    expect(result[0].cost).toBe(4);
    expect(result.every((t) => t.cost === 4)).toBe(true); // All transitions have same cost
  });

  test("should handle null costs", () => {
    const state: InternalSystemState = {
      containers: [
        {
          id: "source",
          slots: ["item"],
          allowedTransitions: [
            {
              targetId: "target",
              from: "start",
              to: "start",
              cost: null,
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

    const result = breadthFirst(state, mockEncodeState, positionHandlers);
    expect(result[0].cost).toBe(null);
  });

  test("should handle undefined costs", () => {
    const state: InternalSystemState = {
      containers: [
        {
          id: "source",
          slots: ["item"],
          allowedTransitions: [
            {
              targetId: "target",
              from: "start",
              to: "start",
              // cost undefined
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

    const result = breadthFirst(state, mockEncodeState, positionHandlers);
    expect(result[0].cost).toBe(null);
  });
});
