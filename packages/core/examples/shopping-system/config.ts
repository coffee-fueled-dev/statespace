import { z } from "zod";
import type { TransitionRules } from "../../src/transitions/types";

export type ShoppingSystem = z.infer<typeof shoppingSystemSchema>;
export const shoppingSystemSchema = z.object({
  ui: z.object({
    page: z.enum(["product-list", "checkout", "confirmation"]),
  }),
  cart: z.object({
    items: z.array(z.string()),
    total: z.number(),
  }),
});

export const transitionRules: TransitionRules<ShoppingSystem> = {
  addItem: {
    constraint: (systemState) => {
      const { ui, cart } = systemState;
      const errors = [];
      if (ui.page !== "product-list") {
        errors.push('Must be on the "product-list" page.');
      }
      if (cart.items.length >= 3) {
        errors.push("Cart is full (max 3 items).");
      }
      return { allowed: errors.length === 0, errors };
    },
    effect: (systemState) => {
      const { cart } = systemState;
      const newItem = "widget";
      return {
        cart: {
          items: [...cart.items, newItem],
          total: cart.total + 10,
        },
      };
    },
    cost: 1,
  },
  goToCheckout: {
    constraint: (systemState) => {
      const { ui, cart } = systemState;
      const errors = [];
      if (ui.page !== "product-list") {
        errors.push('Must be on the "product-list" page.');
      }
      if (cart.items.length === 0) {
        errors.push("Cart is empty.");
      }
      return { allowed: errors.length === 0, errors };
    },
    effect: () => ({
      ui: {
        page: "checkout",
      },
    }),
    cost: 1,
  },
  completeCheckout: {
    constraint: (systemState) => {
      const { ui } = systemState;
      const errors = [];
      if (ui.page !== "checkout") {
        errors.push('Must be on the "checkout" page.');
      }
      return { allowed: errors.length === 0, errors };
    },
    effect: () => ({
      ui: {
        page: "confirmation",
      },
      cart: {
        items: [],
        total: 0,
      },
    }),
    cost: 1,
  },
};
