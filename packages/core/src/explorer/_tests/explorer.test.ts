import { beforeEach, describe, expect, jest, test } from "bun:test";
import type { Codex } from "../../codex/entity";
import type { ExecutableStateSpace } from "../../statespace/domain";
import type { Transition, TransitionResult, TransitionSuccess } from "../../transition/domain";
import { Explorer } from "../adapters";

type MockState = { value: number };

const mockCodex: Codex<MockState> = {
  key: "mock",
  encode: jest.fn(async (state) => JSON.stringify(state)),
  decode: jest.fn(async (key) => JSON.parse(key)),
};

const mockEffect: TransitionSuccess<MockState>["effect"] = {
  path: "value",
  operation: "set",
  value: 1,
};

const mockTransitions: Transition<MockState>[] = [
  { name: "t1", effect: mockEffect, constraints: [] },
  { name: "t2", effect: mockEffect, constraints: [] },
  { name: "t3", effect: mockEffect, constraints: [] },
];

const applyByName = (state: MockState, name: string): TransitionResult<MockState> => {
  if (name === "t1") {
    return { success: true, name, state: { value: 2 }, effect: mockEffect };
  }
  if (name === "t2") {
    return { success: true, name, state: { value: 3 }, effect: mockEffect };
  }
  return {
    success: false,
    name,
    state,
    error: "failed",
    effect: mockEffect,
  };
};

const mockStateSpace: ExecutableStateSpace<MockState> = {
  shape: {
    type: "object",
    properties: {
      value: { type: "number" },
    },
    required: ["value"],
    additionalProperties: false,
  },
  transitions: mockTransitions,
  apply: jest.fn(applyByName),
  enabled: jest.fn((state) => {
    const neighbors: TransitionSuccess<MockState>[] = [];
    for (const transition of mockTransitions) {
      const result = applyByName(state, transition.name);
      if (result.success) {
        neighbors.push(result);
      }
    }
    return neighbors;
  }),
};

describe("Explorer", () => {
  let explorer: Explorer<MockState>;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    explorer = new Explorer(mockStateSpace, mockCodex);
  });

  test("constructor initializes properties correctly", () => {
    expect(explorer.graph.size).toBe(0);
    expect(explorer.uniqueStates).toBe(0);
    expect(explorer.totalOperations).toBe(0);
    expect(explorer.shape).toBe(mockStateSpace.shape);
  });

  test("resetState clears the graph and counters", async () => {
    const initialState = { value: 1 };
    await explorer.neighbors(initialState); // Populate state

    expect(explorer.graph.size).toBeGreaterThan(0);
    expect(explorer.uniqueStates).toBeGreaterThan(0);
    expect(explorer.totalOperations).toBeGreaterThan(0);

    explorer.resetState();

    expect(explorer.graph.size).toBe(0);
    expect(explorer.uniqueStates).toBe(0);
    expect(explorer.totalOperations).toBe(0);
  });

  test("encode and decode should use the provided codex", async () => {
    const state = { value: 1 };
    const encoded = await explorer.encode(state);
    expect(mockCodex.encode).toHaveBeenCalledWith(state);
    expect(encoded).toBe(JSON.stringify(state));

    const decoded = await explorer.decode(encoded);
    expect(mockCodex.decode).toHaveBeenCalledWith(encoded);
    expect(decoded).toEqual(state);
  });

  describe("neighborIterator", () => {
    const initialState = { value: 1 };

    test("omits path on transform-effect edges", async () => {
      const transformEffect: TransitionSuccess<MockState>["effect"] = {
        operation: "transform",
        transform: (state) => ({ success: true, state: { value: state.value + 10 } }),
      };
      const transformSpace: ExecutableStateSpace<MockState> = {
        ...mockStateSpace,
        transitions: [{ name: "bump", effect: transformEffect, constraints: [] }],
        apply: jest.fn((state, name): TransitionResult<MockState> => {
          if (name !== "bump") {
            return { success: false, name, state, error: "unknown", effect: transformEffect };
          }
          return {
            success: true,
            name,
            state: { value: state.value + 10 },
            effect: transformEffect,
          };
        }),
      };
      const transformExplorer = new Explorer(transformSpace, mockCodex);
      await transformExplorer.neighbors(initialState);
      const initialHash = await mockCodex.encode(initialState);
      const nextHash = await mockCodex.encode({ value: 11 });
      const edge = transformExplorer.graph.get(initialHash)?.get(nextHash)?.[0];
      expect(edge?.name).toBe("bump");
      expect(edge?.path).toBeUndefined();
    });

    test("should explore neighbors and update graph correctly on first visit", async () => {
      const neighbors = await explorer.neighbors(initialState);

      // Assertions
      expect(neighbors).toHaveLength(2); // 2 successful transitions
      expect(explorer.totalOperations).toBe(3); // 3 total transitions
      expect(explorer.uniqueStates).toBe(3); // initial state + 2 new states

      const initialStateHash = await mockCodex.encode(initialState);
      const neighbor1Hash = await mockCodex.encode({ value: 2 });
      const neighbor2Hash = await mockCodex.encode({ value: 3 });

      expect(explorer.graph.has(initialStateHash)).toBe(true);
      const transitionsFromInitial = explorer.graph.get(initialStateHash);
      expect(transitionsFromInitial?.size).toBe(2);
      expect(transitionsFromInitial?.has(neighbor1Hash)).toBe(true);
      expect(transitionsFromInitial?.has(neighbor2Hash)).toBe(true);

      // Check transition count
      expect(transitionsFromInitial?.get(neighbor1Hash)?.[1]).toBe(1);
    });

    test("should increment transition count on second visit", async () => {
      // First visit
      await explorer.neighbors(initialState);
      expect(explorer.uniqueStates).toBe(3);
      const initialStateHash = await mockCodex.encode(initialState);
      const neighbor1Hash = await mockCodex.encode({ value: 2 });
      expect(explorer.graph.get(initialStateHash)?.get(neighbor1Hash)?.[1]).toBe(1);

      // Second visit
      await explorer.neighbors(initialState);
      expect(explorer.totalOperations).toBe(6); // 3 more operations
      expect(explorer.uniqueStates).toBe(3); // No new unique states
      expect(explorer.graph.get(initialStateHash)?.get(neighbor1Hash)?.[1]).toBe(2); // Count incremented
    });

    test("passes context to stateSpace.apply for each transition", async () => {
      const context = { quoteId: "quote-123" };
      await explorer.neighbors(initialState, context);

      expect(mockStateSpace.apply).toHaveBeenCalledTimes(3);
      expect(mockStateSpace.apply).toHaveBeenCalledWith(initialState, "t1", context);
      expect(mockStateSpace.apply).toHaveBeenCalledWith(initialState, "t2", context);
      expect(mockStateSpace.apply).toHaveBeenCalledWith(initialState, "t3", context);
    });
  });

  describe("study", () => {
    test("should reset state and call the study function with correct config", async () => {
      // Populate state first
      await explorer.neighbors({ value: 1 });
      expect(explorer.totalOperations).toBe(3);

      const mockStudyFn = jest.fn(async (config) => {
        // Check that state was reset before study was called
        expect(config.explorer.totalOperations).toBe(0);
        return "study_result";
      });
      const config = { initialState: { value: 1 }, exitConditions: [] };

      const result = await explorer.study(mockStudyFn, config);

      expect(result).toBe("study_result");
      expect(mockStudyFn).toHaveBeenCalledTimes(1);
      expect(mockStudyFn).toHaveBeenCalledWith({ explorer, ...config });
    });
  });
});
