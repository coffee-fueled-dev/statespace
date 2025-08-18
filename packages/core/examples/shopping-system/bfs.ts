// =============================================================================
// SHOPPING SYSTEM BREADTH FIRST SEARCH SOLVER
// =============================================================================

import { BFS, jsonKey } from "../../src";
import {
  shoppingSystemSchema,
  transitionRules,
  type ShoppingSystem,
} from "./config";

const shortestPath = await BFS({
  systemSchema: shoppingSystemSchema,
  initialState: {
    ui: {
      page: "product-list",
    },
    cart: {
      items: [],
      total: 0,
    },
  },
  transitionRules,
  targetCondition: ({ ui }) => ui.page === "confirmation",
  keyGenerator: jsonKey<ShoppingSystem>(),
  // A* priority function: f(n) = g(n) + h(n)
  priorityFunction: (node) => {
    return node.cost + (node.state.ui.page === "confirmation" ? 0 : 1);
  },
  // A* should replace paths when we find a cheaper one
  shouldReplace: (existingCost, newCost) => newCost < existingCost,
});

if (shortestPath) {
  console.log("Optimal path found:");
  console.log(shortestPath.path.join(" -> "));
  console.log("Total cost:", shortestPath.cost);
} else {
  console.log("No path found to the target state.");
}
