import { bignumber, factorial, add, evaluate } from "mathjs";
import BitSet from "bitset";
import type { Element, Permutation, LexicalIndex, Container } from "../types";
import { createContext, type CodecContext } from "./create-context";

/**
 * Encode a permutation to its lexical index using BitSet
 * for O(n log n) performance
 */
export function encode(
  permutation: Permutation,
  elements: Element[]
): LexicalIndex;

/**
 * Encode a permutation with automatic element bank padding based on containers
 */
export function encode(
  permutation: Permutation,
  elements: Element[],
  containers: Container[]
): LexicalIndex;

export function encode(
  permutation: Permutation,
  elements: Element[],
  containers?: Container[]
): LexicalIndex {
  let totalSlots: number | undefined;

  if (containers) {
    totalSlots = containers.reduce(
      (sum, container) => sum + container.slots,
      0
    );
  }

  const context = createContext(elements, totalSlots);
  const lehmerCode = generateLehmerCode(permutation, context);
  return lehmerToLexicalIndex(lehmerCode);
}

/**
 * Convert Lehmer code to lexical index using factorial number system
 * Optimized for better performance with precomputed factorials for small values
 */
export function lehmerToLexicalIndex(lehmerCode: number[]): LexicalIndex {
  let index = 0;
  const n = lehmerCode.length;

  for (let i = 0; i < n; i++) {
    const factorialIndex = n - i - 1;
    const coefficient = lehmerCode[i];

    if (coefficient > 0) {
      // Use mathjs for large factorials, direct computation for small ones
      if (factorialIndex <= 20) {
        // Direct computation for small factorials (up to 20!)
        let fact = 1;
        for (let j = 1; j <= factorialIndex; j++) {
          fact *= j;
        }
        index += coefficient * fact;
      } else {
        // Use mathjs for large factorials
        const factorial_val = factorial(bignumber(factorialIndex));
        const term = bignumber(evaluate(`${coefficient} * ${factorial_val}`));
        index = Number(add(bignumber(index), term));
      }
    }
  }

  return index;
}

/**
 * Count how many set bits are less than the given position
 */
function countAvailableBefore(available: BitSet, position: number): number {
  let count = 0;
  for (let i = 0; i < position; i++) {
    if (available.get(i)) {
      count++;
    }
  }
  return count;
}

/**
 * Generate Lehmer code from a permutation using BitSet
 * for O(n log n) performance, handling duplicate elements correctly
 */
export function generateLehmerCode(
  sequence: Permutation,
  context: CodecContext
): number[] {
  const n = sequence.length;
  const lehmer = new Array(n).fill(0);

  // Initialize BitSet with all positions available
  const available = new BitSet();
  for (let i = 0; i < n; i++) {
    available.set(i, 1);
  }

  // Track which positions of duplicate elements have been used
  const usedPositions = new Map<Element, Set<number>>();

  for (let i = 0; i < n; i++) {
    const currentElement = sequence[i];

    // Get all positions of this element in sorted bank
    const positions = context.elementToIndex.get(currentElement) || [];

    // Find the first unused position for this element
    if (!usedPositions.has(currentElement)) {
      usedPositions.set(currentElement, new Set());
    }

    const usedSet = usedPositions.get(currentElement)!;
    const unusedPosition = positions.find((pos) => !usedSet.has(pos))!;

    // Count how many available elements are less than this position
    lehmer[i] = countAvailableBefore(available, unusedPosition);

    // Mark this position as used
    available.set(unusedPosition, 0);
    usedSet.add(unusedPosition);
  }

  return lehmer;
}
