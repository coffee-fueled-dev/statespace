import { test, expect, describe } from "bun:test";
import { decode, lexicalIndexToLehmer } from "./decode";
import { encode } from "./encode";
import { createContext } from "./create-context";

describe("decode", () => {
  describe("Simple elements (no duplicates)", () => {
    const elementBank = ["a", "b", "c", "d"];

    test("should decode index 0 to canonical first permutation", () => {
      const result = decode(0, elementBank);
      expect(result).toEqual(["a", "b", "c", "d"]);
    });

    test("should decode index 23 to canonical last permutation", () => {
      const result = decode(23, elementBank);
      expect(result).toEqual(["d", "c", "b", "a"]);
    });

    test("should handle middle permutations", () => {
      const testCases = [
        { index: 1, expected: ["a", "b", "d", "c"] },
        { index: 11, expected: ["b", "d", "c", "a"] },
        { index: 13, expected: ["c", "a", "d", "b"] },
        { index: 18, expected: ["d", "a", "b", "c"] },
      ];

      testCases.forEach(({ index, expected }) => {
        expect(decode(index, elementBank)).toEqual(expected);
      });
    });

    test("should maintain round-trip consistency", () => {
      // Test all 4! = 24 permutations
      for (let i = 0; i < 24; i++) {
        const decoded = decode(i, elementBank);
        const encoded = encode(decoded, elementBank);
        expect(encoded).toBe(i);
      }
    });
  });

  describe("Duplicate elements", () => {
    const elementBank = ["a", "b", "x", "x"];

    test("should handle canonical mapping for duplicate elements", () => {
      const decoded = decode(0, elementBank);
      expect(decoded).toEqual(["a", "b", "x", "x"]);
    });

    test("should maintain consistency for round-trip operations", () => {
      const testIndices = [0, 1, 5, 10, 15, 20];

      testIndices.forEach((index) => {
        const decoded = decode(index, elementBank);
        const reEncoded = encode(decoded, elementBank);
        const reDecoded = decode(reEncoded, elementBank);

        // The final decoded should equal the first decoded
        expect(reDecoded).toEqual(decoded);
      });
    });

    test("should handle mixed duplicate scenarios", () => {
      const testIndices = [0, 2, 4, 6, 8, 10];

      testIndices.forEach((index) => {
        const decoded = decode(index, elementBank);
        expect(decoded).toHaveLength(4);

        // Should contain the same elements as element bank
        const decodedCounts = new Map();
        decoded.forEach((elem) => {
          decodedCounts.set(elem, (decodedCounts.get(elem) || 0) + 1);
        });

        const bankCounts = new Map();
        elementBank.forEach((elem) => {
          bankCounts.set(elem, (bankCounts.get(elem) || 0) + 1);
        });

        expect(decodedCounts).toEqual(bankCounts);
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
      const decoded = decode(0, elementBank);
      expect(decoded).toHaveLength(13);

      // Should decode to canonical form - index 0 gives the lexicographically first permutation
      // Based on actual output: ["ace", "eight", false, false, false, "five", "jack", "king", "nine", "queen", "seven", "six", "ten"]
      expect(decoded[0]).toBe("ace");
      expect(decoded[1]).toBe("eight");
      expect(decoded[2]).toBe(false);
    });

    test("should maintain consistency for state transitions", () => {
      const testIndices = [0, 1, 100, 1000, 10000];

      testIndices.forEach((index) => {
        const decoded = decode(index, elementBank);
        const reEncoded = encode(decoded, elementBank);
        const reDecoded = decode(reEncoded, elementBank);

        expect(reDecoded).toEqual(decoded);
        expect(decoded).toHaveLength(13);
      });
    });

    test("should preserve element counts", () => {
      const testIndices = [0, 50, 500, 5000];

      testIndices.forEach((index) => {
        const decoded = decode(index, elementBank);

        const elementBankCounts = new Map();
        elementBank.forEach((elem) => {
          elementBankCounts.set(elem, (elementBankCounts.get(elem) || 0) + 1);
        });

        const decodedCounts = new Map();
        decoded.forEach((elem) => {
          decodedCounts.set(elem, (decodedCounts.get(elem) || 0) + 1);
        });

        expect(decodedCounts).toEqual(elementBankCounts);
      });
    });
  });

  describe("Edge cases", () => {
    test("should handle single element", () => {
      const result = decode(0, ["x"]);
      expect(result).toEqual(["x"]);
    });

    test("should handle two identical elements", () => {
      const result = decode(0, ["x", "x"]);
      expect(result).toEqual(["x", "x"]);
    });

    test("should handle empty element bank gracefully", () => {
      const result = decode(0, []);
      expect(result).toEqual([]);
    });

    test("should handle large indices gracefully", () => {
      const elementBank = ["a", "b", "c"];
      // Index larger than 3! - 1 = 5 will cause an error since the factorial number system
      // doesn't naturally handle indices beyond the valid range
      expect(() => decode(100, elementBank)).toThrow("Could not find");
    });

    test("should handle negative indices", () => {
      const elementBank = ["a", "b", "c"];
      expect(() => decode(-1, elementBank)).not.toThrow();
    });
  });

  describe("Performance characteristics", () => {
    test("should handle larger element banks efficiently", () => {
      const largeBank = Array.from({ length: 8 }, (_, i) => `item${i}`);

      const start = performance.now();

      // Test several decode operations
      for (let i = 0; i < 100; i++) {
        const decoded = decode(i, largeBank);
        expect(decoded).toHaveLength(8);
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(1000); // 1 second
    });
  });
});

describe("lexicalIndexToLehmer", () => {
  test("should convert index 0 to all zeros", () => {
    const context = createContext(["a", "b", "c"]);
    const result = lexicalIndexToLehmer(0, context);
    expect(result).toEqual([0, 0, 0]);
  });

  test("should convert small indices correctly", () => {
    const context = createContext(["a", "b", "c"]);

    const testCases = [
      { index: 1, expected: [0, 1, 0] },
      { index: 2, expected: [1, 0, 0] },
      { index: 3, expected: [1, 1, 0] },
      { index: 4, expected: [2, 0, 0] },
      { index: 5, expected: [2, 1, 0] },
    ];

    testCases.forEach(({ index, expected }) => {
      expect(lexicalIndexToLehmer(index, context)).toEqual(expected);
    });
  });

  test("should handle larger indices", () => {
    const context = createContext(["a", "b", "c", "d"]);
    const result = lexicalIndexToLehmer(23, context);
    expect(result).toEqual([3, 2, 1, 0]);
  });

  test("should pad with leading zeros when needed", () => {
    const context = createContext(["a", "b", "c", "d", "e"]);
    const result = lexicalIndexToLehmer(5, context);
    expect(result).toHaveLength(5);
    expect(result[0]).toBe(0); // Should have leading zero
  });
});
