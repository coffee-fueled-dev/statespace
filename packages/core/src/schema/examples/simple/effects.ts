import { type Effect } from "../../effects";
import { symbolValue } from "../../symbols";
import { type System } from "./schemas/zod";

// Different ways to create effects:

// 1. Simple increment effect
const incrementEffect = {
  name: "increment",
  symbol: "a.b.c",
  operation: "add",
  value: 1,
} satisfies Effect<System, "a.b.c">;

// 2. Custom transform effect
const transformEffect = {
  name: "transform",
  symbol: "a.b.c",
  operation: "transform",
  value: (symbol, state) => {
    const currentValue = symbolValue(symbol, state);
    return {
      name: "transform",
      value: currentValue + 5,
      cost: 1,
      meta: { message: "Transformed value" },
    };
  },
} satisfies Effect<System, "a.b.c">;

// 3. Set value effect
const setValue = {
  name: "set",
  symbol: "a.b.c",
  operation: "set",
  value: 42,
} satisfies Effect<System, "a.b.c">;

// 4. Decrement effect
const decrementEffect = {
  name: "decrement",
  symbol: "a.b.c",
  operation: "subtract",
  value: 1,
} satisfies Effect<System, "a.b.c">;
