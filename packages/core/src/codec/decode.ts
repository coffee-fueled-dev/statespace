import BitSet from "bitset";
import type { Element, Permutation, LexicalIndex } from "../types";
import { createContext, type CodecContext } from "./create-context";

/**
 * Decode a lexical index back to its corresponding permutation
 * using BitSet for O(n log n) performance
 */
export function decode(
  index: LexicalIndex,
  elementBank: Element[]
): Permutation {
  const context = createContext(elementBank);
  const lehmerCode = lexicalIndexToLehmer(index, context);
  const n = context.elementBank.length;

  // Initialize BitSet with all positions available (set bits 0 to n-1)
  const available = new BitSet();
  for (let i = 0; i < n; i++) {
    available.set(i, 1);
  }

  const decoded: Element[] = [];

  for (let i = 0; i < n; i++) {
    const rank = lehmerCode[i];

    // Find the rank-th available element
    const elementIndex = findKthAvailableElement(available, rank, context);
    decoded.push(context.sortedBank[elementIndex]);

    // Mark this position as used
    available.set(elementIndex, 0);
  }

  return decoded;
}

/**
 * Find the k-th available element (0-indexed) in the BitSet
 */
function findKthAvailableElement(
  available: BitSet,
  k: number,
  context: CodecContext
): number {
  let count = 0;
  for (let i = 0; i < context.elementBank.length; i++) {
    if (available.get(i)) {
      if (count === k) {
        return i;
      }
      count++;
    }
  }
  throw new Error(`Could not find ${k}-th available element`);
}

/**
 * Convert lexical index to Lehmer code using factorial number system
 */
export function lexicalIndexToLehmer(
  index: LexicalIndex,
  context: CodecContext
): number[] {
  let base = index;
  let i = 2;
  let factoradic: number[] = [0];

  if (base === 0) return new Array(context.elementBank.length).fill(0);

  while (base > 0) {
    const d = Math.floor(base / i);
    const radix = base % i;
    base = d;
    i += 1;
    factoradic = [radix, ...factoradic];
  }

  const diff = context.elementBank.length - factoradic.length;

  // Pad with leading zeros if needed
  if (diff > 0) {
    factoradic = [...new Array(diff).fill(0), ...factoradic];
  }

  return factoradic;
}
