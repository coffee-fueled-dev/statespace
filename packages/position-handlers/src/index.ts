import type { Element, Transition } from "@statespace/core";

// Generic position type - can be any string defined by the user
export type PositionType = string;

export type PositionReference = string;

// Position handler interface for custom position behavior
export interface PositionHandler {
  canMoveFrom: (
    slots: Element[]
  ) => { element: Element; modifiedSlots: Element[] }[];
  canMoveTo: (slots: Element[], transition: Transition) => Element[][];
}

export const start = {
  canMoveFrom: (slots: Element[]) => {
    const element = slots[0];
    if (typeof element === "boolean") return [];
    return [{ element, modifiedSlots: [false, ...slots.slice(1)] }];
  },
  canMoveTo: (slots: Element[], transition: Transition) => {
    return slots[0] === false ? [[transition.element, ...slots.slice(1)]] : [];
  },
};

export const end = {
  canMoveFrom: (slots: Element[]) => {
    const element = slots[slots.length - 1];
    if (typeof element === "boolean") return [];
    return [{ element, modifiedSlots: [...slots.slice(0, -1), false] }];
  },
  canMoveTo: (slots: Element[], transition: Transition) => {
    const lastIndex = slots.length - 1;
    return slots[lastIndex] === false
      ? [[...slots.slice(0, lastIndex), transition.element]]
      : [];
  },
};

export const any = {
  canMoveFrom: (slots: Element[]) => {
    const moves: { element: Element; modifiedSlots: Element[] }[] = [];

    for (let i = 0; i < slots.length; i++) {
      if (typeof slots[i] === "string") {
        const modifiedSlots = [...slots];
        modifiedSlots[i] = false;
        moves.push({ element: slots[i], modifiedSlots });
      }
    }

    return moves;
  },
  canMoveTo: (slots: Element[], transition: Transition) => {
    const placements: Element[][] = [];

    for (let i = 0; i < slots.length; i++) {
      if (slots[i] === false) {
        const newSlots = [...slots];
        newSlots[i] = transition.element;
        placements.push(newSlots);
      }
    }

    return placements;
  },
};

export const top = {
  canMoveFrom: (slots: Element[]) => {
    const element = slots[0];
    if (typeof element === "boolean") return [];
    return [{ element, modifiedSlots: [false, ...slots.slice(1)] }];
  },
  canMoveTo: (slots: Element[], transition: Transition) => {
    return slots[0] === false ? [[transition.element, ...slots.slice(1)]] : [];
  },
};
export const bottom = {
  canMoveFrom: (slots: Element[]) => {
    const element = slots[slots.length - 1];
    if (typeof element === "boolean") return [];
    return [{ element, modifiedSlots: [...slots.slice(0, -1), false] }];
  },
  canMoveTo: (slots: Element[], transition: Transition) => {
    const lastIndex = slots.length - 1;
    return slots[lastIndex] === false
      ? [[...slots.slice(0, lastIndex), transition.element]]
      : [];
  },
};

export const middle = {
  canMoveFrom: (slots: Element[]) => {
    const moves: { element: Element; modifiedSlots: Element[] }[] = [];
    for (let i = 0; i < slots.length; i++) {
      if (typeof slots[i] === "string") {
        const modifiedSlots = [...slots];
        modifiedSlots[i] = false;
        moves.push({ element: slots[i], modifiedSlots });
      }
    }
    return moves;
  },
  canMoveTo: (slots: Element[], transition: Transition) => {
    const placements: Element[][] = [];
    for (let i = 0; i < slots.length; i++) {
      if (slots[i] === false) {
        const newSlots = [...slots];
        newSlots[i] = transition.element;
        placements.push(newSlots);
      }
    }
    return placements;
  },
};

export const stack = {
  canMoveFrom: (slots: Element[]) => {
    // Find the top non-false element
    for (let i = slots.length - 1; i >= 0; i--) {
      if (typeof slots[i] === "string") {
        const modifiedSlots = [...slots];
        modifiedSlots[i] = false;
        return [{ element: slots[i], modifiedSlots }];
      }
    }
    return [];
  },
  canMoveTo: (slots: Element[], transition: Transition) => {
    // Find the first available slot from the bottom
    for (let i = 0; i < slots.length; i++) {
      if (slots[i] === false) {
        const newSlots = [...slots];
        newSlots[i] = transition.element;
        return [newSlots];
      }
    }
    return [];
  },
};
