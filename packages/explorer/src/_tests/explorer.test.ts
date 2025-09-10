import { beforeEach, describe, test, expect, jest } from "bun:test";
import type {
  Codex,
  ExecutableStateSpace,
  TransitionSuccess,
} from "@statespace/core";
import { Explorer } from "../adapters";

// Mocks
const mockCodex: Codex<any> = {
  key: "mock",
  encode: jest.fn(async (state) => JSON.stringify(state)),
  decode: jest.fn(async (key) => JSON.parse(key)),
};

const mockSuccessTransition: TransitionSuccess<any> = {
  success: true,
  name: "t1",
  state: { value: 1 },
  effect: { path: "value", operation: "set", value: 1 },
};

const mockStateSpace: ExecutableStateSpace<any> = {
  shape: { type: "object" },
  transitions: [
    jest.fn(() => ({ ...mockSuccessTransition, state: { value: 2 } })),
    jest.fn(() => ({ ...mockSuccessTransition, state: { value: 3 } })),
    jest.fn(() => ({
      success: false,
      name: "t3",
      state: { value: 1 },
      error: "failed",
      effect: mockSuccessTransition.effect,
    })),
  ],
};

describe("Explorer", () => {
  let explorer: Explorer<any>;

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
      const transitionsFromInitial = explorer.graph.get(initialStateHash)!;
      expect(transitionsFromInitial.size).toBe(2);
      expect(transitionsFromInitial.has(neighbor1Hash)).toBe(true);
      expect(transitionsFromInitial.has(neighbor2Hash)).toBe(true);

      // Check transition count
      expect(transitionsFromInitial.get(neighbor1Hash)![1]).toBe(1);
    });

    test("should increment transition count on second visit", async () => {
      // First visit
      await explorer.neighbors(initialState);
      expect(explorer.uniqueStates).toBe(3);
      const initialStateHash = await mockCodex.encode(initialState);
      const neighbor1Hash = await mockCodex.encode({ value: 2 });
      expect(explorer.graph.get(initialStateHash)!.get(neighbor1Hash)![1]).toBe(
        1,
      );

      // Second visit
      await explorer.neighbors(initialState);
      expect(explorer.totalOperations).toBe(6); // 3 more operations
      expect(explorer.uniqueStates).toBe(3); // No new unique states
      expect(explorer.graph.get(initialStateHash)!.get(neighbor1Hash)![1]).toBe(
        2,
      ); // Count incremented
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
