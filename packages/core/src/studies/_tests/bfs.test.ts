import { describe, expect, jest, test } from "bun:test";
import type { IExplorer } from "../../explorer/domain";
import { bfs } from "../bfs";

type MockState = { value: number };

describe("bfs", () => {
  test("passes study context to explorer.neighbors", async () => {
    const context = { quoteId: "quote-123" };
    const neighbors = jest.fn(async () => []);
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
  });
});
