import { test, expect, describe } from "bun:test";
import { depthFirst } from "./depth-first";
import { breadthFirst } from "./breadth-first";
import type { InternalSystemState, TransitionType } from "../types";
import { start, end, any } from "@statespace/position-handlers";

describe("depthFirst", () => {
  const mockEncodeState = (state: InternalSystemState): number => {
    return JSON.stringify(state.containers.map((c) => c.slots))
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  };

  const positionHandlers = { start, end, any };

  test("should return a generator", () => {
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

    const result = depthFirst(state, mockEncodeState, positionHandlers);

    expect(result[Symbol.iterator]).toBeDefined();
    expect(typeof result.next).toBe("function");
  });

  test("should yield transitions lazily", () => {
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

    const generator = depthFirst(state, mockEncodeState, positionHandlers);

    // Manual iteration
    const first = generator.next();
    expect(first.done).toBe(false);
    expect(first.value).toMatchObject({
      element: "x",
      fromContainer: "source",
      toContainer: "target",
    });

    // Should be able to continue
    const second = generator.next();
    expect(second.done).toBe(false);

    // Convert to array should work
    const remaining = Array.from(generator);
    expect(remaining.length).toBeGreaterThan(0);
  });

  test("should work with for...of loops", () => {
    const state: InternalSystemState = {
      containers: [
        {
          id: "source",
          slots: ["a", "b"],
          allowedTransitions: [{ targetId: "target", from: "any", to: "any" }],
        },
        {
          id: "target",
          slots: [false, false],
          allowedTransitions: [],
        },
      ],
    };

    const transitions = [];
    for (const transition of depthFirst(
      state,
      mockEncodeState,
      positionHandlers
    )) {
      transitions.push(transition);
    }

    expect(transitions.length).toBeGreaterThan(0);
    expect(transitions[0]).toMatchObject({
      element: expect.any(String),
      fromContainer: "source",
      toContainer: "target",
    });
  });

  test("should yield same transitions as breadthFirst", () => {
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
          allowedTransitions: [],
        },
      ],
    };

    const dfTransitions = Array.from(
      depthFirst(state, mockEncodeState, positionHandlers)
    );
    const bfTransitions = breadthFirst(
      state,
      mockEncodeState,
      positionHandlers
    );

    expect(dfTransitions).toHaveLength(bfTransitions.length);

    // Should contain same transitions (order may differ)
    const dfSet = new Set(
      dfTransitions.map(
        (t) => `${t.element}-${t.fromContainer}-${t.toContainer}`
      )
    );
    const bfSet = new Set(
      bfTransitions.map(
        (t) => `${t.element}-${t.fromContainer}-${t.toContainer}`
      )
    );

    expect(dfSet).toEqual(bfSet);
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

    const generator = depthFirst(
      state,
      mockEncodeState,
      positionHandlers,
      customGetType
    );
    const first = generator.next();

    expect(first.value.transitionType).toBe("DRAW");
  });

  test("should allow early termination for memory efficiency", () => {
    const state: InternalSystemState = {
      containers: [
        {
          id: "source",
          slots: ["a", "b", "c", "d"],
          allowedTransitions: [{ targetId: "target", from: "any", to: "any" }],
        },
        {
          id: "target",
          slots: [false, false, false, false],
          allowedTransitions: [],
        },
      ],
    };

    const generator = depthFirst(state, mockEncodeState, positionHandlers);

    // Take only first 2 transitions
    const transitions = [];
    let count = 0;
    for (const transition of generator) {
      if (count >= 2) break;
      transitions.push(transition);
      count++;
    }

    expect(transitions).toHaveLength(2);
    expect(transitions[0].element).toEqual(expect.any(String));
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
              cost: 3,
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

    const generator = depthFirst(state, mockEncodeState, positionHandlers);
    const first = generator.next();

    expect(first.value.cost).toBe(3);
  });

  test("should evaluate cost functions", () => {
    const state: InternalSystemState = {
      containers: [
        {
          id: "source",
          slots: ["valuable", "common", "rare"],
          allowedTransitions: [
            {
              targetId: "target",
              from: "any",
              to: "any",
              cost: (currentState) => {
                // Dynamic cost based on state
                const source = currentState.containers.find(
                  (c) => c.id === "source"
                );
                return source
                  ? source.slots.filter((s) => s !== false).length
                  : 1;
              },
            },
          ],
        },
        {
          id: "target",
          slots: [false, false, false],
          allowedTransitions: [],
        },
      ],
    };

    const generator = depthFirst(state, mockEncodeState, positionHandlers);
    const transitions = Array.from(generator);

    // Should evaluate cost function: 3 elements in source
    expect(transitions[0].cost).toBe(3);
    expect(transitions.every((t) => t.cost === 3)).toBe(true);
  });

  test("should handle cost functions with generator lazy evaluation", () => {
    let functionCallCount = 0;

    const state: InternalSystemState = {
      containers: [
        {
          id: "source",
          slots: ["a", "b"],
          allowedTransitions: [
            {
              targetId: "target",
              from: "any",
              to: "any",
              cost: (currentState) => {
                functionCallCount++;
                return 2;
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

    const generator = depthFirst(state, mockEncodeState, positionHandlers);

    // Function should not be called until we actually consume the generator
    expect(functionCallCount).toBe(0);

    // Get first transition
    const first = generator.next();
    expect(first.value.cost).toBe(2);
    expect(functionCallCount).toBe(1);

    // Get second transition
    const second = generator.next();
    expect(second.value.cost).toBe(2);
    expect(functionCallCount).toBe(2);
  });
});
