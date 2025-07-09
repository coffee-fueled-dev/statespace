import { test, expect, describe } from "bun:test";
import { decode, lexicalIndexToLehmer } from "./decode";
import { encode } from "./encode";
import { createContext } from "./create-context";
import type { Container } from "../types";

describe("decode", () => {
  const elementBank = ["a", "b", "c", "d"];

  test("should decode basic permutations", () => {
    expect(decode(0, elementBank)).toEqual(["a", "b", "c", "d"]);
    expect(decode(23, elementBank)).toEqual(["d", "c", "b", "a"]);
    expect(decode(1, elementBank)).toEqual(["a", "b", "d", "c"]);
    expect(decode(13, elementBank)).toEqual(["c", "a", "d", "b"]);
  });

  test("should maintain round-trip consistency", () => {
    for (let i = 0; i < 24; i++) {
      const decoded = decode(i, elementBank);
      const encoded = encode(decoded, elementBank);
      expect(encoded).toBe(i);
    }
  });

  test("should decode with automatic padding from containers", () => {
    const containers: Container[] = [
      { id: "container1", slots: 3, allowedTransitions: [] },
      { id: "container2", slots: 2, allowedTransitions: [] },
    ];

    const result = decode(0, ["a", "b", "c"], containers);

    expect(result).toHaveLength(5); // Padded to total slots
    expect(result.filter((x) => x === false)).toHaveLength(2);
    expect(result.filter((x) => x !== false)).toHaveLength(3);
  });

  test("should handle duplicate elements", () => {
    const duplicateBank = ["a", "b", "x", "x"];

    expect(decode(0, duplicateBank)).toEqual(["a", "b", "x", "x"]);

    // Should maintain consistency for round-trips
    const testIndices = [0, 1, 5, 10];
    testIndices.forEach((index) => {
      const decoded = decode(index, duplicateBank);
      const reEncoded = encode(decoded, duplicateBank);
      const reDecoded = decode(reEncoded, duplicateBank);
      expect(reDecoded).toEqual(decoded);
    });
  });

  test("should preserve element counts", () => {
    const cardBank = ["ace", "king", "queen", false, false];

    const decoded = decode(0, cardBank);
    expect(decoded).toHaveLength(5);

    // Count elements
    const originalCounts = new Map();
    cardBank.forEach((elem) => {
      originalCounts.set(elem, (originalCounts.get(elem) || 0) + 1);
    });

    const decodedCounts = new Map();
    decoded.forEach((elem) => {
      decodedCounts.set(elem, (decodedCounts.get(elem) || 0) + 1);
    });

    expect(decodedCounts).toEqual(originalCounts);
  });

  test("should handle edge cases", () => {
    expect(decode(0, ["x"])).toEqual(["x"]);
    expect(decode(0, [])).toEqual([]);
    expect(() => decode(-1, elementBank)).not.toThrow();
    expect(() => decode(100, elementBank)).toThrow("Could not find");
  });
});

describe("lexicalIndexToLehmer", () => {
  test("should convert indices to Lehmer codes", () => {
    const context = createContext(["a", "b", "c"]);

    expect(lexicalIndexToLehmer(0, context)).toEqual([0, 0, 0]);
    expect(lexicalIndexToLehmer(1, context)).toEqual([0, 1, 0]);
    expect(lexicalIndexToLehmer(5, context)).toEqual([2, 1, 0]);
  });

  test("should handle larger indices", () => {
    const context = createContext(["a", "b", "c", "d"]);
    const result = lexicalIndexToLehmer(23, context);

    expect(result).toEqual([3, 2, 1, 0]);
    expect(result).toHaveLength(4);
  });
});
