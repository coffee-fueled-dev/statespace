import { describe, expect, jest, test } from "bun:test";
import type { HashedTransition, IExplorer } from "../../explorer/domain";
import type { TransitionSuccess } from "../../transition/domain";
import { bfs } from "../bfs";

type MockState = { value: number };

const effect: TransitionSuccess<MockState>["effect"] = {
  path: "value",
  operation: "set",
  value: 2,
};

describe("bfs", () => {
  test("passes study context to explorer.neighbors on initial and loop calls", async () => {
    const context = { quoteId: "quote-123" };
    const nextState: MockState = { value: 2 };
    const nextNeighbor: HashedTransition<MockState> = {
      hash: JSON.stringify(nextState),
      result: {
        success: true,
        name: "t1",
        state: nextState,
        effect,
      },
    };
    const neighbors = jest.fn(async (state: MockState) =>
      state.value === 1 ? [nextNeighbor] : [],
    );
    const explorer = {
      graph: new Map(),
      uniqueStates: 0,
      totalOperations: 0,
      shape: { type: "object" },
      neighbors,
      neighborIterator: jest.fn(),
      encode: jest.fn(async (state: MockState) => JSON.stringify(state)),
      decode: jest.fn(async (key: string) => JSON.parse(key)),
      study: jest.fn(),
      resetState: jest.fn(),
    } as unknown as IExplorer<MockState>;

    await bfs({
      explorer,
      initialState: { value: 1 },
      context,
      exitConditions: [],
    });

    expect(neighbors).toHaveBeenCalledWith({ value: 1 }, context);
    expect(neighbors).toHaveBeenCalledWith(nextState, context);
  });
});
