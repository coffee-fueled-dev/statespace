import { describe, expect, jest, test } from "bun:test";
import type { HashedTransition, IExplorer } from "../../explorer/domain";
import type { TransitionSuccess } from "../../transition/domain";
import { bfs } from "../bfs";

type MockState = { id: string };

const effect: TransitionSuccess<MockState>["effect"] = {
  path: "id",
  operation: "set",
  value: "x",
};

function success(name: string, state: MockState): TransitionSuccess<MockState> {
  return { success: true, name, state, effect };
}

function neighbor(name: string, state: MockState): HashedTransition<MockState> {
  return { hash: state.id, result: success(name, state) };
}

function mockExplorer(
  neighbors: (state: MockState) => Promise<HashedTransition<MockState>[]>,
): IExplorer<MockState> {
  return {
    graph: new Map(),
    uniqueStates: 0,
    totalOperations: 0,
    shape: { type: "object" },
    neighbors: jest.fn(neighbors),
    neighborIterator: jest.fn(),
    encode: jest.fn(async (state: MockState) => state.id),
    decode: jest.fn(async (key: string) => ({ id: key })),
    study: jest.fn(),
    resetState: jest.fn(),
  } as unknown as IExplorer<MockState>;
}

describe("bfs", () => {
  test("passes study context to explorer.neighbors on initial and loop calls", async () => {
    const context = { quoteId: "quote-123" };
    const nextState: MockState = { id: "b" };
    const nextNeighbor = neighbor("t1", nextState);
    const explorer = mockExplorer(async (state) => (state.id === "a" ? [nextNeighbor] : []));

    await bfs({
      explorer,
      initialState: { id: "a" },
      context,
      exitConditions: [],
    });

    expect(explorer.neighbors).toHaveBeenCalledWith({ id: "a" }, context);
    expect(explorer.neighbors).toHaveBeenCalledWith(nextState, context);
  });

  test("expands breadth-first (FIFO): both B nodes before C", async () => {
    // A → B1, A → B2, B1 → C
    const expandedViaNeighbors: string[] = [];
    const explorer = mockExplorer(async (state) => {
      expandedViaNeighbors.push(state.id);
      if (state.id === "A") {
        return [neighbor("toB1", { id: "B1" }), neighbor("toB2", { id: "B2" })];
      }
      if (state.id === "B1") {
        return [neighbor("toC", { id: "C" })];
      }
      return [];
    });

    await bfs({
      explorer,
      initialState: { id: "A" },
      exitConditions: [],
    });

    // Initial A, then B1 and B2 (same layer) before C
    expect(expandedViaNeighbors).toEqual(["A", "B1", "B2", "C"]);
  });

  test("reconstructPath returns the first-discovered (shortest) path", async () => {
    // Short: A → G; Long: A → X → G. First discovery of G must be via A.
    const explorer = mockExplorer(async (state) => {
      if (state.id === "A") {
        return [neighbor("direct", { id: "G" }), neighbor("viaX", { id: "X" })];
      }
      if (state.id === "X") {
        return [neighbor("late", { id: "G" })];
      }
      return [];
    });

    const result = await bfs({
      explorer,
      initialState: { id: "A" },
      exitConditions: [],
    });

    const path = await result.reconstructPath?.("G");
    expect(path?.map((t) => t.name)).toEqual(["direct"]);
  });

  test("does not re-enqueue a state reached by a longer path", async () => {
    // A → B, A → C → B — B must expand only once (parent stays A).
    const expandedViaNeighbors: string[] = [];
    const explorer = mockExplorer(async (state) => {
      expandedViaNeighbors.push(state.id);
      if (state.id === "A") {
        return [neighbor("toB", { id: "B" }), neighbor("toC", { id: "C" })];
      }
      if (state.id === "C") {
        return [neighbor("lateB", { id: "B" })];
      }
      return [];
    });

    const result = await bfs({
      explorer,
      initialState: { id: "A" },
      exitConditions: [],
    });

    expect(expandedViaNeighbors.filter((id) => id === "B")).toHaveLength(1);
    const path = await result.reconstructPath?.("B");
    expect(path?.map((t) => t.name)).toEqual(["toB"]);
  });
});
