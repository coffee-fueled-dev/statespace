import { type Effect } from "../../effects";
import { pathValue } from "../../paths";
import { type System } from "./schemas/zod";

// Different ways to create effects:

// 1. Simple increment effect
const incrementEffect = {
  name: "increment",
  path: "a.b.c",
  operation: "add",
  value: 1,
} satisfies Effect<System, "a.b.c">;

// 2. Custom transform effect
const transformEffect = {
  name: "transform",
  path: "a.b.c",
  operation: "transform",
  value: (path, state) => {
    const currentValue = pathValue(path, state);
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
  path: "a.b.c",
  operation: "set",
  value: 42,
} satisfies Effect<System, "a.b.c">;

// 4. Decrement effect
const decrementEffect = {
  name: "decrement",
  path: "a.b.c",
  operation: "subtract",
  value: 1,
} satisfies Effect<System, "a.b.c">;
