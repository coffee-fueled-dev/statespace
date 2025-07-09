import { test, expect, describe } from "bun:test";
import { encode, generateLehmerCode, lehmerToLexicalIndex } from "./encode";
import { createContext } from "./create-context";

describe("encode", () => {
  describe("Simple elements (no duplicates)", () => {
    const elementBank = ["a", "b", "c", "d"];

    test("should encode canonical first permutation", () => {
      const result = encode(["a", "b", "c", "d"], elementBank);
      expect(result).toBe(0);
    });

    test("should encode canonical last permutation", () => {
      const result = encode(["d", "c", "b", "a"], elementBank);
      expect(result).toBe(23);
    });

    test("should encode second permutation", () => {
      const result = encode(["a", "b", "d", "c"], elementBank);
      expect(result).toBe(1);
    });

    test("should encode middle permutations", () => {
      const testCases = [
        { perm: ["c", "a", "d", "b"], expectedIndex: 13 },
        { perm: ["b", "d", "c", "a"], expectedIndex: 11 },
        { perm: ["d", "a", "b", "c"], expectedIndex: 18 },
      ];

      testCases.forEach(({ perm, expectedIndex }) => {
        expect(encode(perm, elementBank)).toBe(expectedIndex);
      });
    });

    test("should handle all 24 permutations consistently", () => {
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
  });

  describe("Duplicate elements", () => {
    const elementBank = ["a", "b", "x", "x"];

    test("should handle canonical mapping for duplicate elements", () => {
      const result = encode(["a", "b", "x", "x"], elementBank);
      expect(result).toBe(0);
    });

    test("should maintain consistency for non-duplicate positions", () => {
      const perm1 = ["a", "b", "x", "x"];
      const perm2 = ["b", "a", "x", "x"];

      const encoded1 = encode(perm1, elementBank);
      const encoded2 = encode(perm2, elementBank);

      expect(encoded1).not.toBe(encoded2);
    });

    test("should handle mixed duplicate scenarios", () => {
      const testPermutations = [
        ["a", "x", "b", "x"],
        ["a", "x", "x", "b"],
        ["x", "a", "b", "x"],
        ["x", "x", "a", "b"],
      ];

      testPermutations.forEach((perm) => {
        const encoded = encode(perm, elementBank);
        expect(typeof encoded).toBe("number");
        expect(encoded).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("Card game scenario", () => {
    const elementBank = [
      "ace",
      "king",
      "queen",
      "jack",
      "ten",
      "nine",
      "eight",
      "seven",
      "six",
      "five",
      false,
      false,
      false,
    ];

    test("should handle realistic card game permutations", () => {
      const cardPermutation = [
        "ace",
        "king",
        "queen",
        "jack",
        "ten",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
      ];

      const encoded = encode(cardPermutation, elementBank);
      expect(typeof encoded).toBe("number");
      expect(encoded).toBeGreaterThanOrEqual(0);
    });

    test("should handle edge cases with all false values first", () => {
      const allFalseFirst = [
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        "ace",
        "king",
        "queen",
        "jack",
        "ten",
      ];

      expect(() => encode(allFalseFirst, elementBank)).not.toThrow();
    });
  });

  describe("Error handling", () => {
    const elementBank = ["a", "b", "c"];

    test("should handle wrong elements gracefully", () => {
      const result = encode(["x", "y", "z"], elementBank);
      expect(typeof result).toBe("number");
    });

    test("should handle wrong length permutations", () => {
      expect(() => encode(["a", "b"], elementBank)).not.toThrow();
      expect(() => encode(["a", "b", "c", "d"], elementBank)).not.toThrow();

      const shortResult = encode(["a", "b"], elementBank);
      expect(typeof shortResult).toBe("number");
    });

    test("should handle empty permutation", () => {
      expect(() => encode([], elementBank)).not.toThrow();
    });

    test("should handle empty element bank", () => {
      expect(() => encode([], [])).not.toThrow();
    });
  });

  describe("Performance characteristics", () => {
    test("should handle larger element banks efficiently", () => {
      const largeBank = Array.from({ length: 8 }, (_, i) => `item${i}`);
      const permutation = [...largeBank].reverse();

      const start = performance.now();
      const result = encode(permutation, largeBank);
      const end = performance.now();

      expect(typeof result).toBe("number");
      expect(end - start).toBeLessThan(100); // Should complete quickly
    });
  });
});

describe("generateLehmerCode", () => {
  test("should generate correct Lehmer code for simple permutation", () => {
    const context = createContext(["a", "b", "c", "d"]);
    const lehmer = generateLehmerCode(["b", "a", "d", "c"], context);
    expect(lehmer).toEqual([1, 0, 1, 0]);
  });

  test("should handle duplicate elements", () => {
    const context = createContext(["a", "b", "x", "x"]);
    const lehmer = generateLehmerCode(["a", "x", "b", "x"], context);
    expect(Array.isArray(lehmer)).toBe(true);
    expect(lehmer).toHaveLength(4);
  });

  test("should handle identity permutation", () => {
    const context = createContext(["a", "b", "c"]);
    const lehmer = generateLehmerCode(["a", "b", "c"], context);
    expect(lehmer).toEqual([0, 0, 0]);
  });
});

describe("lehmerToLexicalIndex", () => {
  test("should convert Lehmer code to lexical index", () => {
    expect(lehmerToLexicalIndex([0, 0, 0, 0])).toBe(0);
    expect(lehmerToLexicalIndex([0, 0, 0, 1])).toBe(1);
    expect(lehmerToLexicalIndex([3, 2, 1, 0])).toBe(23);
  });

  test("should handle empty Lehmer code", () => {
    expect(lehmerToLexicalIndex([])).toBe(0);
  });

  test("should handle single element", () => {
    expect(lehmerToLexicalIndex([0])).toBe(0);
  });

  test("should handle larger factorials", () => {
    // Test with larger Lehmer codes that require mathjs
    const largeLehmer = new Array(25).fill(1);
    const result = lehmerToLexicalIndex(largeLehmer);
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThan(0);
  });
});
