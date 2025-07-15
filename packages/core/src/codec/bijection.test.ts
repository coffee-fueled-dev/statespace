import { test, expect, describe } from "bun:test";
import { encode, decode } from "./index";
import type { Element } from "../types";

describe("Codec Bijection Properties", () => {
  test("should maintain perfect bijection for simple element bank", () => {
    const elements = ["a", "b", "c"];
    const maxIndex = 6; // 3! = 6
    const indexSet = new Set<number>();
    const permutationSet = new Set<string>();

    // Test encode -> decode -> encode round-trip
    for (let i = 0; i < maxIndex; i++) {
      const permutation = decode(i, elements);
      const reEncoded = encode(permutation, elements);
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
    const elements = ["x", "y", "x"];

    // Test canonical mapping for duplicates
    const variants = [
      ["x", "y", "x"],
      ["x", "x", "y"],
    ];

    variants.forEach((variant) => {
      const index = encode(variant, elements);
      const canonical = decode(index, elements);
      const reEncoded = encode(canonical, elements);

      expect(reEncoded).toBe(index);
      expect(countElements(canonical)).toEqual(countElements(elements));
    });
  });

  test("should maintain bijection for larger set", () => {
    const elements = ["a", "b", "c", "d"];
    const maxIndex = 24; // 4! = 24
    const indices = new Set<number>();

    for (let i = 0; i < maxIndex; i++) {
      const permutation = decode(i, elements);
      const index = encode(permutation, elements);

      expect(index).toBe(i);
      expect(indices.has(index)).toBe(false);
      indices.add(index);
    }

    expect(indices.size).toBe(24);
  });

  test("should handle mixed types (string and false)", () => {
    const elements = ["a", false, "b"];
    const maxIndex = 6;

    for (let i = 0; i < maxIndex; i++) {
      const permutation = decode(i, elements);
      const index = encode(permutation, elements);

      expect(index).toBe(i);
      expect(permutation).toHaveLength(3);
      expect(permutation.filter((x) => x === false)).toHaveLength(1);
      expect(permutation.filter((x) => typeof x === "string")).toHaveLength(2);
    }
  });

  test("should perform efficiently on larger sets", () => {
    const elements = ["a", "b", "c", "d", "e"];
    const sampleSize = 50; // Sample of 5! = 120

    const start = performance.now();

    for (let i = 0; i < sampleSize; i++) {
      const permutation = decode(i, elements);
      const index = encode(permutation, elements);
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
