import { test, expect, describe } from "bun:test";
import { createContext } from "./create-context";

describe("createContext", () => {
  test("should create context with element bank", () => {
    const elements = ["a", "b", "c"];
    const context = createContext(elements);

    expect(context.elements).toEqual(["a", "b", "c"]);
    expect(context.sortedBank).toEqual(["a", "b", "c"]);
    expect(context.elementToIndex.get("a")).toEqual([0]);
    expect(context.elementToIndex.get("b")).toEqual([1]);
    expect(context.elementToIndex.get("c")).toEqual([2]);
  });

  test("should handle duplicate elements", () => {
    const context = createContext(["x", "a", "x"]);

    expect(context.sortedBank).toEqual(["a", "x", "x"]);
    expect(context.elementToIndex.get("a")).toEqual([0]);
    expect(context.elementToIndex.get("x")).toEqual([1, 2]);
  });

  test("should sort false values correctly", () => {
    const context = createContext(["a", false, "b"]);

    expect(context.sortedBank).toEqual(["a", "b", false]); // false sorts last
    expect(context.elementToIndex.get(false)).toEqual([2]);
  });

  test("should pad element bank when totalSlots is larger", () => {
    const context = createContext(["a", "b"], 5);

    expect(context.elements).toEqual(["a", "b", false, false, false]);
    expect(context.sortedBank).toEqual(["a", "b", false, false, false]);
    expect(context.elementToIndex.get(false)).toEqual([2, 3, 4]);
  });

  test("should not pad when element bank matches or exceeds totalSlots", () => {
    const exact = createContext(["a", "b", "c"], 3);
    expect(exact.elements).toEqual(["a", "b", "c"]);

    const larger = createContext(["a", "b", "c", "d"], 3);
    expect(larger.elements).toEqual(["a", "b", "c", "d"]);
  });

  test("should handle padding with existing false values", () => {
    const context = createContext(["a", false, "b"], 6);

    expect(context.elements).toHaveLength(6);
    expect(context.elements.filter((x) => x === false)).toHaveLength(4); // 1 original + 3 padding
  });

  test("should handle empty element bank with totalSlots", () => {
    const context = createContext([], 3);

    expect(context.elements).toEqual([false, false, false]);
    expect(context.elementToIndex.get(false)).toEqual([0, 1, 2]);
  });
});
