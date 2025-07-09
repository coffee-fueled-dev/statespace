import type { PositionHandler } from "@statespace/position-handlers";
import type { Element, Transition } from "@statespace/core";

/**
 * Card Game Mechanics
 * Provides position handlers for card game containers with cost-aware transitions
 */

const deckPositions: Record<string, PositionHandler> = {
  top: {
    canMoveFrom: (slots: Element[]) => {
      const topCard = slots[0];
      if (typeof topCard === "boolean") return [];
      return [{ element: topCard, modifiedSlots: [false, ...slots.slice(1)] }];
    },
    canMoveTo: (slots: Element[], transition: Transition) => {
      if (slots[0] !== false) return [];
      return [[transition.element, ...slots.slice(1)]];
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
    canMoveTo: (slots: Element[], transition: Transition) => {
      const lastIndex = slots.length - 1;
      if (slots[lastIndex] !== false) return [];
      return [[...slots.slice(0, lastIndex), transition.element]];
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
    canMoveTo: (slots: Element[], transition: Transition) => {
      const openings = slots
        .map((slot, index) => (slot === false ? index : undefined))
        .filter((index): index is number => index !== undefined);

      return openings.map((opening) => {
        const newSlots = [...slots];
        newSlots[opening] = transition.element;
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
    canMoveTo: (slots: Element[], transition: Transition) => {
      // Check if move is too expensive for stack operations
      if (typeof transition.cost === "number" && transition.cost > 5) {
        return []; // Reject expensive moves to stacks
      }

      for (let i = 0; i < slots.length; i++) {
        if (slots[i] === false) {
          return [
            [...slots.slice(0, i), transition.element, ...slots.slice(i + 1)],
          ];
        }
      }
      return [];
    },
  },
};

// Cost-aware position handler for premium/expensive operations
const premiumPositions: Record<string, PositionHandler> = {
  premium: {
    canMoveFrom: (slots: Element[]) => {
      // Can move any card but with higher cost implications
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
    canMoveTo: (slots: Element[], transition: Transition) => {
      // Only allow moves with sufficient cost (premium actions cost more)
      if (typeof transition.cost === "number" && transition.cost < 3) {
        return []; // Reject cheap moves to premium positions
      }

      // Allow placement in any open slot
      const openings = slots
        .map((slot, index) => (slot === false ? index : undefined))
        .filter((index): index is number => index !== undefined);

      return openings.map((opening) => {
        const newSlots = [...slots];
        newSlots[opening] = transition.element;
        return newSlots;
      });
    },
  },
  // Budget position handler for cost-conscious moves
  budget: {
    canMoveFrom: (slots: Element[]) => {
      const topCard = slots[0];
      if (typeof topCard === "boolean") return [];
      return [{ element: topCard, modifiedSlots: [false, ...slots.slice(1)] }];
    },
    canMoveTo: (slots: Element[], transition: Transition) => {
      // Only allow free or very cheap moves
      if (typeof transition.cost === "number" && transition.cost > 1) {
        return []; // Reject expensive moves
      }

      if (slots[0] !== false) return [];
      return [[transition.element, ...slots.slice(1)]];
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

// Card-specific cost calculator
export const cardCostCalculator = (cardType: string, action: string) => {
  const baseCosts: Record<string, number> = {
    common: 1,
    uncommon: 2,
    rare: 3,
    legendary: 5,
  };

  const actionMultipliers: Record<string, number> = {
    DRAW: 1,
    PLAY: 2,
    DISCARD: 0.5,
    SHUFFLE: 1.5,
  };

  const baseCost = baseCosts[cardType] || 1;
  const multiplier = actionMultipliers[action] || 1;

  return Math.ceil(baseCost * multiplier);
};

// Export position handlers by container type
export const cardGamePositionHandlers = {
  ...deckPositions,
  ...flexiblePositions,
  ...stackPositions,
  ...premiumPositions,
};

export { cardGameTransitionLogic };
