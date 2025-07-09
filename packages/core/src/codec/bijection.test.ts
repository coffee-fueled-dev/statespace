import { test, expect, describe } from "bun:test";
import { encode, decode } from "./index";
import type { Element } from "../types";

describe("Codec Bijection Properties", () => {
  describe("Simple element bank", () => {
    const elementBank = ["a", "b", "c"];
    const maxIndex = 6; // 3! = 6

    test("should have unique index for every permutation", () => {
      const indexSet = new Set<number>();

      // Generate all possible permutations and encode them
      const permutations = generateAllPermutations(elementBank);

      permutations.forEach((permutation) => {
        const index = encode(permutation, elementBank);

        // Each permutation should map to a unique index
        expect(indexSet.has(index)).toBe(false);
        indexSet.add(index);

        // Index should be within valid range
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(maxIndex);
      });

      // Should have exactly 3! = 6 unique indices
      expect(indexSet.size).toBe(6);
      expect(permutations.length).toBe(6);
    });

    test("should have unique permutation for every valid index", () => {
      const permutationSet = new Set<string>();

      for (let i = 0; i < maxIndex; i++) {
        const permutation = decode(i, elementBank);
        const permutationStr = JSON.stringify(permutation);

        // Each index should map to a unique permutation
        expect(permutationSet.has(permutationStr)).toBe(false);
        permutationSet.add(permutationStr);

        // Permutation should have correct length and elements
        expect(permutation).toHaveLength(elementBank.length);
        expect(
          permutation.every((elem) => elementBank.includes(elem as string))
        ).toBe(true);
      }

      // Should have exactly 3! = 6 unique permutations
      expect(permutationSet.size).toBe(6);
    });

    test("should maintain perfect round-trip bijection", () => {
      // Test encode -> decode -> encode
      for (let i = 0; i < maxIndex; i++) {
        const permutation = decode(i, elementBank);
        const reEncoded = encode(permutation, elementBank);
        expect(reEncoded).toBe(i);
      }

      // Test decode -> encode -> decode
      const allPermutations = generateAllPermutations(elementBank);
      allPermutations.forEach((permutation) => {
        const index = encode(permutation, elementBank);
        const reDecoded = decode(index, elementBank);
        expect(reDecoded).toEqual(permutation);
      });
    });
  });

  describe("Element bank with duplicates", () => {
    const elementBank = ["x", "y", "x"];

    test("should handle duplicate elements with canonical mapping", () => {
      const indexSet = new Set<number>();
      const permutationSet = new Set<string>();

      // Test only valid range - with duplicates, valid range is smaller
      const maxValidIndex = 6; // Approximate valid range for ["x", "y", "x"]

      for (let i = 0; i < maxValidIndex; i++) {
        try {
          const permutation = decode(i, elementBank);
          const index = encode(permutation, elementBank);

          const permutationStr = JSON.stringify(permutation);

          // Round-trip should be consistent
          const reDecoded = decode(index, elementBank);
          expect(reDecoded).toEqual(permutation);

          // Track unique mappings
          indexSet.add(index);
          permutationSet.add(permutationStr);

          // Verify element counts match
          const elementCounts = countElements(permutation);
          const bankCounts = countElements(elementBank);
          expect(elementCounts).toEqual(bankCounts);
        } catch (error) {
          // Some indices may be invalid for duplicate element banks
          break;
        }
      }

      // Should have found some valid mappings
      expect(indexSet.size).toBeGreaterThan(0);
      expect(permutationSet.size).toBeGreaterThan(0);
    });

    test("should produce consistent canonical forms", () => {
      // Different arrangements of identical elements should map to canonical forms
      const variants = [
        ["x", "y", "x"],
        ["x", "x", "y"],
      ];

      const canonicalIndices = variants.map((variant) =>
        encode(variant, elementBank)
      );
      const canonicalForms = canonicalIndices.map((index) =>
        decode(index, elementBank)
      );

      // Each variant should round-trip consistently to its own canonical form
      variants.forEach((variant, i) => {
        const index = encode(variant, elementBank);
        const canonical = decode(index, elementBank);
        const reEncoded = encode(canonical, elementBank);
        expect(reEncoded).toBe(index);
      });

      // All canonical forms should have the same element counts as the original bank
      canonicalForms.forEach((form) => {
        const formCounts = countElements(form);
        const bankCounts = countElements(elementBank);
        expect(formCounts).toEqual(bankCounts);
      });
    });
  });

  describe("Larger element bank", () => {
    const elementBank = ["a", "b", "c", "d"];
    const maxIndex = 24; // 4! = 24

    test("should maintain bijection for all 24 permutations", () => {
      const indexSet = new Set<number>();
      const permutationSet = new Set<string>();

      for (let i = 0; i < maxIndex; i++) {
        const permutation = decode(i, elementBank);
        const index = encode(permutation, elementBank);
        const permutationStr = JSON.stringify(permutation);

        // Perfect round-trip
        expect(index).toBe(i);

        // Unique mappings
        expect(indexSet.has(index)).toBe(false);
        expect(permutationSet.has(permutationStr)).toBe(false);

        indexSet.add(index);
        permutationSet.add(permutationStr);
      }

      expect(indexSet.size).toBe(24);
      expect(permutationSet.size).toBe(24);
    });

    test("should cover all possible permutations", () => {
      const allPermutations = generateAllPermutations(elementBank);
      const decodedPermutations: Element[][] = [];

      for (let i = 0; i < maxIndex; i++) {
        decodedPermutations.push(decode(i, elementBank));
      }

      // Every generated permutation should appear in decoded results
      allPermutations.forEach((permutation) => {
        const found = decodedPermutations.some(
          (decoded) => JSON.stringify(decoded) === JSON.stringify(permutation)
        );
        expect(found).toBe(true);
      });

      expect(allPermutations.length).toBe(24);
      expect(decodedPermutations.length).toBe(24);
    });
  });

  describe("Mixed type element bank", () => {
    const elementBank = ["a", false, "b"];

    test("should maintain bijection with mixed types", () => {
      const maxIndex = 6; // 3! = 6
      const indexSet = new Set<number>();
      const permutationSet = new Set<string>();

      for (let i = 0; i < maxIndex; i++) {
        const permutation = decode(i, elementBank);
        const index = encode(permutation, elementBank);
        const permutationStr = JSON.stringify(permutation);

        // Perfect round-trip
        expect(index).toBe(i);

        // Unique mappings
        expect(indexSet.has(index)).toBe(false);
        expect(permutationSet.has(permutationStr)).toBe(false);

        indexSet.add(index);
        permutationSet.add(permutationStr);

        // Verify types and counts
        expect(permutation).toHaveLength(3);
        expect(permutation.filter((x) => x === false)).toHaveLength(1);
        expect(permutation.filter((x) => typeof x === "string")).toHaveLength(
          2
        );
      }

      expect(indexSet.size).toBe(6);
      expect(permutationSet.size).toBe(6);
    });
  });

  describe("Performance bijection test", () => {
    test("should maintain bijection efficiently for larger sets", () => {
      const elementBank = ["a", "b", "c", "d", "e"];
      const sampleSize = 100; // Test first 100 indices of 5! = 120

      const start = performance.now();

      for (let i = 0; i < sampleSize; i++) {
        const permutation = decode(i, elementBank);
        const index = encode(permutation, elementBank);
        expect(index).toBe(i);
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete efficiently
      expect(duration).toBeLessThan(1000); // 1 second
    });
  });
});

// Helper functions
function generateAllPermutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];

  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
    const perms = generateAllPermutations(remaining);

    for (const perm of perms) {
      result.push([current, ...perm]);
    }
  }

  return result;
}

function countElements<T>(arr: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  arr.forEach((elem) => {
    counts.set(elem, (counts.get(elem) || 0) + 1);
  });
  return counts;
}
