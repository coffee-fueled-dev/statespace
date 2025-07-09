import { test, expect, describe } from "bun:test";
import { encode, decode } from "./index";
import type { Element } from "../types";

describe("Codec Bijection Properties", () => {
  test("should maintain perfect bijection for simple element bank", () => {
    const elementBank = ["a", "b", "c"];
    const maxIndex = 6; // 3! = 6
    const indexSet = new Set<number>();
    const permutationSet = new Set<string>();

    // Test encode -> decode -> encode round-trip
    for (let i = 0; i < maxIndex; i++) {
      const permutation = decode(i, elementBank);
      const reEncoded = encode(permutation, elementBank);
      const permutationStr = JSON.stringify(permutation);

      expect(reEncoded).toBe(i);
      expect(indexSet.has(reEncoded)).toBe(false);
      expect(permutationSet.has(permutationStr)).toBe(false);

      indexSet.add(reEncoded);
      permutationSet.add(permutationStr);
    }

    expect(indexSet.size).toBe(6);
    expect(permutationSet.size).toBe(6);
  });

  test("should handle duplicate elements consistently", () => {
    const elementBank = ["x", "y", "x"];

    // Test canonical mapping for duplicates
    const variants = [
      ["x", "y", "x"],
      ["x", "x", "y"],
    ];

    variants.forEach((variant) => {
      const index = encode(variant, elementBank);
      const canonical = decode(index, elementBank);
      const reEncoded = encode(canonical, elementBank);

      expect(reEncoded).toBe(index);
      expect(countElements(canonical)).toEqual(countElements(elementBank));
    });
  });

  test("should maintain bijection for larger set", () => {
    const elementBank = ["a", "b", "c", "d"];
    const maxIndex = 24; // 4! = 24
    const indices = new Set<number>();

    for (let i = 0; i < maxIndex; i++) {
      const permutation = decode(i, elementBank);
      const index = encode(permutation, elementBank);

      expect(index).toBe(i);
      expect(indices.has(index)).toBe(false);
      indices.add(index);
    }

    expect(indices.size).toBe(24);
  });

  test("should handle mixed types (string and false)", () => {
    const elementBank = ["a", false, "b"];
    const maxIndex = 6;

    for (let i = 0; i < maxIndex; i++) {
      const permutation = decode(i, elementBank);
      const index = encode(permutation, elementBank);

      expect(index).toBe(i);
      expect(permutation).toHaveLength(3);
      expect(permutation.filter((x) => x === false)).toHaveLength(1);
      expect(permutation.filter((x) => typeof x === "string")).toHaveLength(2);
    }
  });

  test("should perform efficiently on larger sets", () => {
    const elementBank = ["a", "b", "c", "d", "e"];
    const sampleSize = 50; // Sample of 5! = 120

    const start = performance.now();

    for (let i = 0; i < sampleSize; i++) {
      const permutation = decode(i, elementBank);
      const index = encode(permutation, elementBank);
      expect(index).toBe(i);
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100); // Should be very fast
  });
});

// Helper function
function countElements<T>(arr: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  arr.forEach((elem) => {
    counts.set(elem, (counts.get(elem) || 0) + 1);
  });
  return counts;
}
