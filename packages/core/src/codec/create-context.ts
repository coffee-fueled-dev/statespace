import type { Element } from "../types";

export interface CodecContext {
  elementBank: Element[];
  sortedBank: Element[];
  elementToIndex: Map<Element, number[]>;
}

/**
 * Create codec context for encoding/decoding operations
 */
export function createContext(elementBank: Element[]): CodecContext {
  const sortedBank = [...elementBank].sort((a, b) => {
    const aStr = String(a);
    const bStr = String(b);
    return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
  });

  // Create mapping from elements to their indices in sorted bank
  // Handle duplicate elements by storing all their positions
  const elementToIndex = new Map<Element, number[]>();
  sortedBank.forEach((element, index) => {
    if (!elementToIndex.has(element)) {
      elementToIndex.set(element, []);
    }
    elementToIndex.get(element)!.push(index);
  });

  return { elementBank: [...elementBank], sortedBank, elementToIndex };
}
