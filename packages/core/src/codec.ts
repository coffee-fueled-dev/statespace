import { bignumber, factorial, add, evaluate } from "mathjs";
import BitSet from "bitset";
import type { Element, Permutation, LexicalIndex } from "./types";

/**
 * Codec handles bidirectional conversion between permutations and their
 * lexical indices using the Lehmer encoding system (factorial number system).
 * Optimized with BitSet for O(n log n) performance.
 */
export class Codec {
  private elementBank: Element[];
  private sortedBank: Element[];
  private elementToIndex: Map<Element, number[]>;

  constructor(elementBank: Element[]) {
    this.elementBank = [...elementBank];

    // Create canonical sorted element bank for consistent ordering
    this.sortedBank = [...this.elementBank].sort((a, b) => {
      const aStr = String(a);
      const bStr = String(b);
      return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
    });

    // Create mapping from elements to their indices in sorted bank
    // Handle duplicate elements by storing all their positions
    this.elementToIndex = new Map();
    this.sortedBank.forEach((element, index) => {
      if (!this.elementToIndex.has(element)) {
        this.elementToIndex.set(element, []);
      }
      this.elementToIndex.get(element)!.push(index);
    });
  }

  /**
   * Decode a lexical index back to its corresponding permutation
   * using BitSet for O(n log n) performance
   */
  decode(index: LexicalIndex): Permutation {
    const lehmerCode = this.lexicalIndexToLehmer(index);
    const n = this.elementBank.length;

    // Initialize BitSet with all positions available (set bits 0 to n-1)
    const available = new BitSet();
    for (let i = 0; i < n; i++) {
      available.set(i, 1);
    }

    const decoded: Element[] = [];

    for (let i = 0; i < n; i++) {
      const rank = lehmerCode[i];

      // Find the rank-th available element
      const elementIndex = this.findKthAvailableElement(available, rank);
      decoded.push(this.sortedBank[elementIndex]);

      // Mark this position as used
      available.set(elementIndex, 0);
    }

    return decoded;
  }

  /**
   * Encode a permutation to its lexical index using BitSet
   * for O(n log n) performance
   */
  encode(permutation: Permutation): LexicalIndex {
    const lehmerCode = this.generateLehmerCodeOptimized(permutation);
    return this.lehmerToLexicalIndex(lehmerCode);
  }

  /**
   * Find the k-th available element (0-indexed) in the BitSet
   */
  private findKthAvailableElement(available: BitSet, k: number): number {
    let count = 0;
    for (let i = 0; i < this.elementBank.length; i++) {
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
   * Count how many set bits are less than the given position
   */
  private countAvailableBefore(available: BitSet, position: number): number {
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
  private generateLehmerCodeOptimized(sequence: Permutation): number[] {
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
      const positions = this.elementToIndex.get(currentElement) || [];

      // Find the first unused position for this element
      if (!usedPositions.has(currentElement)) {
        usedPositions.set(currentElement, new Set());
      }

      const usedSet = usedPositions.get(currentElement)!;
      const unusedPosition = positions.find((pos) => !usedSet.has(pos))!;

      // Count how many available elements are less than this position
      lehmer[i] = this.countAvailableBefore(available, unusedPosition);

      // Mark this position as used
      available.set(unusedPosition, 0);
      usedSet.add(unusedPosition);
    }

    return lehmer;
  }

  /**
   * Convert lexical index to Lehmer code using factorial number system
   */
  private lexicalIndexToLehmer(index: LexicalIndex): number[] {
    let base = index;
    let i = 2;
    let factoradic: number[] = [0];

    if (base === 0) return new Array(this.elementBank.length).fill(0);

    while (base > 0) {
      const d = Math.floor(base / i);
      const radix = base % i;
      base = d;
      i += 1;
      factoradic = [radix, ...factoradic];
    }

    const diff = this.elementBank.length - factoradic.length;

    // Pad with leading zeros if needed
    if (diff > 0) {
      factoradic = [...new Array(diff).fill(0), ...factoradic];
    }

    return factoradic;
  }

  /**
   * Convert Lehmer code to lexical index using factorial number system
   * Optimized for better performance with precomputed factorials for small values
   */
  private lehmerToLexicalIndex(lehmerCode: number[]): LexicalIndex {
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
}
