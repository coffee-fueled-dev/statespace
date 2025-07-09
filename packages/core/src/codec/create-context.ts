import type { Element } from "../types";

export interface CodecContext {
  elementBank: Element[];
  sortedBank: Element[];
  elementToIndex: Map<Element, number[]>;
}

/**
 * Create codec context for encoding/decoding operations
 */
export function createContext(
  elementBank: Element[],
  totalSlots?: number
): CodecContext {
  // Automatically pad element bank if totalSlots is provided
  let paddedElementBank = [...elementBank];

  if (totalSlots !== undefined) {
    const currentLength = elementBank.length;
    if (currentLength < totalSlots) {
      // Pad with false values to match total slots
      const padding = new Array(totalSlots - currentLength).fill(false);
      paddedElementBank = [...elementBank, ...padding];
    }
  }

  const sortedBank = [...paddedElementBank].sort((a, b) => {
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

  return { elementBank: paddedElementBank, sortedBank, elementToIndex };
}
