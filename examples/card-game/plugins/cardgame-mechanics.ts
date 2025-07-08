import type { PositionHandler, PositionPlugin } from "@statespace/core";

/**
 * Card Game Mechanics Plugin
 * Provides position handlers for card game containers
 */

const deckPositions: Record<string, PositionHandler> = {
  top: {
    canMoveFrom: (slots) => {
      const topCard = slots[0];
      if (typeof topCard === "boolean") return [];
      return [{ element: topCard, modifiedSlots: [false, ...slots.slice(1)] }];
    },
    canMoveTo: (slots, element) => {
      if (slots[0] !== false) return [];
      return [[element, ...slots.slice(1)]];
    },
  },
  bottom: {
    canMoveFrom: (slots) => {
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
    canMoveTo: (slots, element) => {
      const lastIndex = slots.length - 1;
      if (slots[lastIndex] !== false) return [];
      return [[...slots.slice(0, lastIndex), element]];
    },
  },
};

const flexiblePositions: Record<string, PositionHandler> = {
  middle: {
    canMoveFrom: (slots) => {
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
    canMoveTo: (slots, element) => {
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
    canMoveFrom: (slots) => {
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
    canMoveTo: (slots, element) => {
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

export const cardgameMechanicsPlugin: PositionPlugin = {
  name: "cardgame-mechanics",
  description: "Position handlers for card game mechanics",
  version: "1.0.0",

  containerTypes: {
    deck: deckPositions,
    hand: flexiblePositions,
    field: flexiblePositions,
    discard: stackPositions,
  },

  getTransitionType: cardGameTransitionLogic,
};

export default cardgameMechanicsPlugin;
