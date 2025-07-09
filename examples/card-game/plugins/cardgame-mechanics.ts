import type { PositionHandler } from "@statespace/position-handlers";
import type { Element } from "@statespace/core";

/**
 * Card Game Mechanics
 * Provides position handlers for card game containers
 */

const deckPositions: Record<string, PositionHandler> = {
  top: {
    canMoveFrom: (slots: Element[]) => {
      const topCard = slots[0];
      if (typeof topCard === "boolean") return [];
      return [{ element: topCard, modifiedSlots: [false, ...slots.slice(1)] }];
    },
    canMoveTo: (slots: Element[], element: Element) => {
      if (slots[0] !== false) return [];
      return [[element, ...slots.slice(1)]];
    },
  },
  bottom: {
    canMoveFrom: (slots: Element[]) => {
      const lastIndex = slots.length - 1;
      const bottomCard = slots[lastIndex];
      if (typeof bottomCard === "boolean") return [];
      return [
        {
          element: bottomCard,
          modifiedSlots: [...slots.slice(0, lastIndex), false],
        },
      ];
    },
    canMoveTo: (slots: Element[], element: Element) => {
      const lastIndex = slots.length - 1;
      if (slots[lastIndex] !== false) return [];
      return [[...slots.slice(0, lastIndex), element]];
    },
  },
};

const flexiblePositions: Record<string, PositionHandler> = {
  middle: {
    canMoveFrom: (slots: Element[]) => {
      return slots
        .map((element, index) => ({ element, index }))
        .filter(({ element }) => typeof element === "string")
        .map(({ element, index }) => ({
          element,
          modifiedSlots: [
            ...slots.slice(0, index),
            false,
            ...slots.slice(index + 1),
          ],
        }));
    },
    canMoveTo: (slots: Element[], element: Element) => {
      const openings = slots
        .map((slot, index) => (slot === false ? index : undefined))
        .filter((index): index is number => index !== undefined);

      return openings.map((opening) => {
        const newSlots = [...slots];
        newSlots[opening] = element;
        return newSlots;
      });
    },
  },
};

const stackPositions: Record<string, PositionHandler> = {
  stack: {
    canMoveFrom: (slots: Element[]) => {
      for (let i = 0; i < slots.length; i++) {
        if (slots[i] !== false) {
          return [
            {
              element: slots[i],
              modifiedSlots: [
                ...slots.slice(0, i),
                false,
                ...slots.slice(i + 1),
              ],
            },
          ];
        }
      }
      return [];
    },
    canMoveTo: (slots: Element[], element: Element) => {
      for (let i = 0; i < slots.length; i++) {
        if (slots[i] === false) {
          return [[...slots.slice(0, i), element, ...slots.slice(i + 1)]];
        }
      }
      return [];
    },
  },
};

const cardGameTransitionLogic = (
  fromContainer: string,
  toContainer: string,
  action?: string
): string => {
  if (action) return action;

  if (fromContainer === "deck" && toContainer === "hand") return "DRAW";
  if (fromContainer === "hand" && toContainer === "field") return "PLAY";
  if (toContainer === "discard") return "DISCARD";
  if (fromContainer === "discard" && toContainer === "deck") return "SHUFFLE";

  return "MOVE";
};

// Export position handlers by container type
export const cardGamePositionHandlers = {
  ...deckPositions,
  ...flexiblePositions,
  ...stackPositions,
};
