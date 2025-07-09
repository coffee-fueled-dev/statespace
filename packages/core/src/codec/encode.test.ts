import { test, expect, describe } from "bun:test";
import { encode, generateLehmerCode, lehmerToLexicalIndex } from "./encode";
import { createContext } from "./create-context";
import type { Container } from "../types";

describe("encode", () => {
  const elementBank = ["a", "b", "c", "d"];

  test("should encode basic permutations", () => {
    expect(encode(["a", "b", "c", "d"], elementBank)).toBe(0);
    expect(encode(["d", "c", "b", "a"], elementBank)).toBe(23);
    expect(encode(["a", "b", "d", "c"], elementBank)).toBe(1);
    expect(encode(["c", "a", "d", "b"], elementBank)).toBe(13);
  });

  test("should encode all permutations uniquely", () => {
    const allPermutations = [
      ["a", "b", "c", "d"],
      ["a", "b", "d", "c"],
      ["a", "c", "b", "d"],
      ["a", "c", "d", "b"],
      ["a", "d", "b", "c"],
      ["a", "d", "c", "b"],
      ["b", "a", "c", "d"],
      ["b", "a", "d", "c"],
      ["b", "c", "a", "d"],
      ["b", "c", "d", "a"],
      ["b", "d", "a", "c"],
      ["b", "d", "c", "a"],
      ["c", "a", "b", "d"],
      ["c", "a", "d", "b"],
      ["c", "b", "a", "d"],
      ["c", "b", "d", "a"],
      ["c", "d", "a", "b"],
      ["c", "d", "b", "a"],
      ["d", "a", "b", "c"],
      ["d", "a", "c", "b"],
      ["d", "b", "a", "c"],
      ["d", "b", "c", "a"],
      ["d", "c", "a", "b"],
      ["d", "c", "b", "a"],
    ];

    const encodedIndices = new Set();
    allPermutations.forEach((perm, expectedIndex) => {
      const encoded = encode(perm, elementBank);
      expect(encoded).toBe(expectedIndex);
      expect(encodedIndices.has(encoded)).toBe(false);
      encodedIndices.add(encoded);
    });

    expect(encodedIndices.size).toBe(24);
  });

  test("should encode with automatic padding from containers", () => {
    const containers: Container[] = [
      { id: "container1", slots: 3, allowedTransitions: [] },
      { id: "container2", slots: 2, allowedTransitions: [] },
    ];

    const testCases = [
      ["a", "b", "c", false, false],
      ["a", false, "b", "c", false],
      [false, false, "a", "b", "c"],
    ];

    testCases.forEach((permutation) => {
      const result = encode(permutation, ["a", "b", "c"], containers);
      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThanOrEqual(0);
    });

    // Different arrangements should produce different indices
    const index1 = encode(
      ["a", "b", "c", false, false],
      ["a", "b", "c"],
      containers
    );
    const index2 = encode(
      ["a", false, "b", "c", false],
      ["a", "b", "c"],
      containers
    );
    expect(index1).not.toBe(index2);
  });

  test("should handle duplicate elements", () => {
    const duplicateBank = ["a", "b", "x", "x"];

    expect(encode(["a", "b", "x", "x"], duplicateBank)).toBe(0);
    expect(encode(["b", "a", "x", "x"], duplicateBank)).not.toBe(
      encode(["a", "b", "x", "x"], duplicateBank)
    );

    const testPerms = [
      ["a", "x", "b", "x"],
      ["x", "a", "b", "x"],
      ["x", "x", "a", "b"],
    ];
    testPerms.forEach((perm) => {
      const encoded = encode(perm, duplicateBank);
      expect(typeof encoded).toBe("number");
      expect(encoded).toBeGreaterThanOrEqual(0);
    });
  });

  test("should handle various edge cases", () => {
    // Wrong elements, wrong lengths, empty cases
    expect(typeof encode(["x", "y", "z"], elementBank)).toBe("number");
    expect(() => encode(["a", "b"], elementBank)).not.toThrow();
    expect(() => encode([], [])).not.toThrow();

    // Mixed scenarios with false values
    const cardBank = ["ace", "king", "queen", false, false];
    const cardPerm = ["ace", false, "king", "queen", false];
    expect(typeof encode(cardPerm, cardBank)).toBe("number");
  });
});

describe("generateLehmerCode", () => {
  test("should generate Lehmer codes", () => {
    const context = createContext(["a", "b", "c", "d"]);

    expect(generateLehmerCode(["b", "a", "d", "c"], context)).toEqual([
      1, 0, 1, 0,
    ]);
    expect(
      generateLehmerCode(["a", "b", "c"], createContext(["a", "b", "c"]))
    ).toEqual([0, 0, 0]);
  });

  test("should handle duplicates", () => {
    const context = createContext(["a", "b", "x", "x"]);
    const lehmer = generateLehmerCode(["a", "x", "b", "x"], context);

    expect(Array.isArray(lehmer)).toBe(true);
    expect(lehmer).toHaveLength(4);
  });
});

describe("lehmerToLexicalIndex", () => {
  test("should convert Lehmer codes to indices", () => {
    expect(lehmerToLexicalIndex([0, 0, 0, 0])).toBe(0);
    expect(lehmerToLexicalIndex([0, 0, 0, 1])).toBe(1);
    expect(lehmerToLexicalIndex([3, 2, 1, 0])).toBe(23);
    expect(lehmerToLexicalIndex([])).toBe(0);
  });

  test("should handle large factorials", () => {
    const largeLehmer = new Array(25).fill(1);
    const result = lehmerToLexicalIndex(largeLehmer);

    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThan(0);
  });
});
