import { describe, expect, jest, test } from "bun:test";
import type { HashedTransition, IExplorer } from "../../explorer/domain";
import type { TransitionSuccess } from "../../transition/domain";
import { uniformCost } from "../uniformCost";

type MockState = { id: string };

function success(name: string, state: MockState, cost: number): TransitionSuccess<MockState> {
  const effect: TransitionSuccess<MockState>["effect"] = {
    path: "id",
    operation: "set",
    value: state.id,
    cost,
  };
  return { success: true, name, state, effect };
}

function neighbor(name: string, state: MockState, cost: number): HashedTransition<MockState> {
  return { hash: state.id, result: success(name, state, cost) };
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

describe("uniformCost", () => {
  test("expands lower-cost neighbors before higher-cost ones", async () => {
    const expandedViaNeighbors: string[] = [];
    const explorer = mockExplorer(async (state) => {
      expandedViaNeighbors.push(state.id);
      if (state.id === "A") {
        // Costly branch first in list; cheap branch second — priority must prefer cheap.
        return [neighbor("expensive", { id: "EXP" }, 10), neighbor("cheap", { id: "CHEAP" }, 1)];
      }
      return [];
    });

    await uniformCost({
      explorer,
      initialState: { id: "A" },
      exitConditions: [],
    });

    expect(expandedViaNeighbors).toEqual(["A", "CHEAP", "EXP"]);
  });

  test("equal costs dequeue in enqueue order (FIFO among ties)", async () => {
    const expandedViaNeighbors: string[] = [];
    const explorer = mockExplorer(async (state) => {
      expandedViaNeighbors.push(state.id);
      if (state.id === "A") {
        return [
          neighbor("first", { id: "B1" }, 0),
          neighbor("second", { id: "B2" }, 0),
          neighbor("third", { id: "B3" }, 0),
        ];
      }
      return [];
    });

    await uniformCost({
      explorer,
      initialState: { id: "A" },
      exitConditions: [],
    });

    expect(expandedViaNeighbors).toEqual(["A", "B1", "B2", "B3"]);
  });

  test("prefers cheaper multi-step path over expensive direct edge", async () => {
    // Direct A→B cost 5; via C: A→C(1)→B(1) cumulative 2.
    const expandedViaNeighbors: string[] = [];
    const explorer = mockExplorer(async (state) => {
      expandedViaNeighbors.push(state.id);
      if (state.id === "A") {
        return [neighbor("direct", { id: "B" }, 5), neighbor("toC", { id: "C" }, 1)];
      }
      if (state.id === "C") {
        return [neighbor("viaC", { id: "B" }, 1)];
      }
      return [];
    });

    const result = await uniformCost({
      explorer,
      initialState: { id: "A" },
      exitConditions: [],
    });

    expect(expandedViaNeighbors).toEqual(["A", "C", "B"]);
    const path = await result.reconstructPath?.("B");
    expect(path?.map((t) => t.name)).toEqual(["toC", "viaC"]);
  });

  test("terminates on cycles without revisiting settled states", async () => {
    const expandedViaNeighbors: string[] = [];
    const explorer = mockExplorer(async (state) => {
      expandedViaNeighbors.push(state.id);
      if (state.id === "A") {
        return [neighbor("toB", { id: "B" }, 1)];
      }
      if (state.id === "B") {
        return [neighbor("backA", { id: "A" }, 1), neighbor("toC", { id: "C" }, 1)];
      }
      return [];
    });

    const result = await uniformCost({
      explorer,
      initialState: { id: "A" },
      exitConditions: [],
    });

    expect(expandedViaNeighbors).toEqual(["A", "B", "C"]);
    expect(result.exitReason).toBe("Search exhausted without meeting exit conditions");
  });
});
