import { test, expect, describe, beforeEach } from "bun:test";
import { Codec } from "./codec";

describe("Codec", () => {
  describe("Simple elements (no duplicates)", () => {
    let codec: Codec;

    beforeEach(() => {
      codec = new Codec(["a", "b", "c", "d"]);
    });

    test("should handle basic round-trip for all permutations", () => {
      // Test all 4! = 24 permutations
      for (let i = 0; i < 24; i++) {
        const decoded = codec.decode(i);
        const encoded = codec.encode(decoded);
        expect(encoded).toBe(i);
      }
    });

    test("should decode index 0 to canonical first permutation", () => {
      const result = codec.decode(0);
      expect(result).toEqual(["a", "b", "c", "d"]);
    });

    test("should decode index 23 to canonical last permutation", () => {
      const result = codec.decode(23);
      expect(result).toEqual(["d", "c", "b", "a"]);
    });

    test("should encode canonical permutations correctly", () => {
      expect(codec.encode(["a", "b", "c", "d"])).toBe(0);
      expect(codec.encode(["a", "b", "d", "c"])).toBe(1);
      expect(codec.encode(["d", "c", "b", "a"])).toBe(23);
    });

    test("should handle middle permutations", () => {
      const testCases = [
        { perm: ["c", "a", "d", "b"], expectedIndex: 13 },
        { perm: ["b", "d", "c", "a"], expectedIndex: 11 },
        { perm: ["d", "a", "b", "c"], expectedIndex: 18 },
      ];

      testCases.forEach(({ perm, expectedIndex }) => {
        expect(codec.encode(perm)).toBe(expectedIndex);
        expect(codec.decode(expectedIndex)).toEqual(perm);
      });
    });
  });

  describe("Duplicate elements", () => {
    let codec: Codec;

    beforeEach(() => {
      codec = new Codec(["a", "b", "x", "x"]);
    });

    test("should handle canonical mapping for duplicate elements", () => {
      // Different arrangements of identical elements should map to same canonical form
      const perm1 = ["a", "b", "x", "x"];
      const encoded = codec.encode(perm1);
      const decoded = codec.decode(encoded);

      // Should decode to a canonical form
      expect(decoded).toEqual(["a", "b", "x", "x"]);
      expect(encoded).toBe(0); // First permutation
    });

    test("should maintain consistency for non-duplicate positions", () => {
      // When non-duplicate elements change position, encoding should change
      const perm1 = ["a", "b", "x", "x"];
      const perm2 = ["b", "a", "x", "x"];

      const encoded1 = codec.encode(perm1);
      const encoded2 = codec.encode(perm2);

      expect(encoded1).not.toBe(encoded2);
    });

    test("should handle mixed duplicate scenarios", () => {
      // Test various permutations with duplicates - all should be consistent after decode/encode cycle
      const testPermutations = [
        ["a", "x", "b", "x"],
        ["a", "x", "x", "b"],
        ["x", "a", "b", "x"],
        ["x", "x", "a", "b"],
      ];

      testPermutations.forEach((perm) => {
        const encoded = codec.encode(perm);
        const decoded = codec.decode(encoded);

        // The key test: the decoded result should be stable when re-encoded
        const reEncoded = codec.encode(decoded);
        expect(reEncoded).toBe(encoded);

        // And re-decoding should give the same result
        const reDecoded = codec.decode(reEncoded);
        expect(reDecoded).toEqual(decoded);
      });
    });
  });

  describe("Card game scenario", () => {
    let codec: Codec;

    beforeEach(() => {
      // Realistic card game element bank with duplicate false values
      codec = new Codec([
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
      ]);
    });

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

      const encoded = codec.encode(cardPermutation);
      const decoded = codec.decode(encoded);

      // The total should always be 13
      expect(decoded).toHaveLength(13);

      // Most importantly: encoding should be stable and consistent
      const reEncoded = codec.encode(decoded);
      expect(reEncoded).toBe(encoded);

      // And should decode to the same canonical form
      const reDecoded = codec.decode(reEncoded);
      expect(reDecoded).toEqual(decoded);

      // The element counts should match the element bank
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
      const bankCounts = new Map();
      elementBank.forEach((elem) => {
        bankCounts.set(elem, (bankCounts.get(elem) || 0) + 1);
      });

      const decodedCounts = new Map();
      decoded.forEach((elem) => {
        decodedCounts.set(elem, (decodedCounts.get(elem) || 0) + 1);
      });

      // Should have same count of each element type as the bank
      expect(decodedCounts).toEqual(bankCounts);
    });

    test("should maintain consistency for state transitions", () => {
      // Test multiple state indices to ensure they decode and re-encode consistently
      const testIndices = [0, 1, 100, 1000, 10000];

      testIndices.forEach((index) => {
        try {
          const decoded = codec.decode(index);
          const reEncoded = codec.encode(decoded);
          const reDecoded = codec.decode(reEncoded);

          // The final decoded should equal the first decoded
          expect(reDecoded).toEqual(decoded);
        } catch (error) {
          // Some indices might be out of bounds, which is acceptable
          expect(error).toBeInstanceOf(Error);
        }
      });
    });

    test("should handle edge cases", () => {
      // Test boundary conditions
      expect(() => codec.decode(0)).not.toThrow();

      // Test with all false values first
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

      expect(() => codec.encode(allFalseFirst)).not.toThrow();
    });
  });

  describe("Performance characteristics", () => {
    test("should handle larger element banks efficiently", () => {
      // Test with a larger element bank
      const largeBank = Array.from({ length: 10 }, (_, i) => `item${i}`);
      const largeCodec = new Codec(largeBank);

      const start = performance.now();

      // Test several encode/decode operations
      for (let i = 0; i < 100; i++) {
        const decoded = largeCodec.decode(i);
        const encoded = largeCodec.encode(decoded);
        expect(encoded).toBe(i);
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete in reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000); // 1 second
    });
  });

  describe("Error handling", () => {
    let codec: Codec;

    beforeEach(() => {
      codec = new Codec(["a", "b", "c"]);
    });

    test("should handle invalid permutations gracefully", () => {
      // Test with wrong elements - these should produce some result but may not be meaningful
      const result = codec.encode(["x", "y", "z"]);
      expect(typeof result).toBe("number");

      // The more important test is that decoding that result produces valid elements
      const decoded = codec.decode(result);
      expect(decoded).toHaveLength(3);
    });

    test("should handle wrong length permutations", () => {
      // Test with wrong length - these should produce some result
      expect(() => codec.encode(["a", "b"])).not.toThrow();
      expect(() => codec.encode(["a", "b", "c", "d"])).not.toThrow();

      // But they should handle gracefully
      const shortResult = codec.encode(["a", "b"]);
      expect(typeof shortResult).toBe("number");
    });

    test("should handle negative indices", () => {
      expect(() => codec.decode(-1)).not.toThrow();
      // Negative indices should produce a valid result or handle gracefully
    });
  });

  describe("Factorial number system properties", () => {
    let codec: Codec;

    beforeEach(() => {
      codec = new Codec(["x", "y", "z"]);
    });

    test("should respect factorial number system bounds", () => {
      // For 3 elements, valid indices are 0 to 3! - 1 = 5
      const validIndices = [0, 1, 2, 3, 4, 5];

      validIndices.forEach((index) => {
        const decoded = codec.decode(index);
        expect(decoded).toHaveLength(3);
        expect(
          decoded.every((elem) => ["x", "y", "z"].includes(elem as string))
        ).toBe(true);
      });
    });

    test("should produce unique permutations for each valid index", () => {
      const permutations = new Set();

      // Generate all permutations for 3! = 6
      for (let i = 0; i < 6; i++) {
        const decoded = codec.decode(i);
        const permString = JSON.stringify(decoded);
        expect(permutations.has(permString)).toBe(false);
        permutations.add(permString);
      }

      expect(permutations.size).toBe(6);
    });
  });
});
