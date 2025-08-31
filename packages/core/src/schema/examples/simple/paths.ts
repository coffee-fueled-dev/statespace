import { isPath, pathValue, type Path } from "../../paths";
import { state } from "./schemas/json-schema";
import { type System } from "./schemas/zod";

const a = pathValue("a", state); // const a: { b: { c: number } }
const ab = pathValue("a.b", state); // const ab: { c: number }
const abc = pathValue("a.b.c", state); // const abc: number

const literalState = {
  a: {
    b: {
      c: 0,
    },
  },
} as const;
const constA = pathValue("a", literalState); // const constA: { readonly b: { readonly c: 0 } }
const constAB = pathValue("a.b", literalState); // const constAB: { readonly c: 0 }
const constABC = pathValue("a.b.c", literalState); // const constABC: 0

console.log("Parsed values:", { a, ab, abc });
console.log("Literal values:", { constA, constAB, constABC });

type Paths = Path<System>; // type Paths = "a" | "a.b" | "a.b.c"

// These should now infer the correct boolean literal types at compile time
const aPath = isPath("a", state); // const aPath: true
const abPath = isPath("a.b", state); // const abPath: true
const abcPath = isPath("a.b.c", state); // const abcPath: true
const invalidPath = isPath("x.y.z", state); // const invalidPath: false
const dotPath = isPath(".", state); // const dotPath: false

console.log("Path checks:", {
  aPath,
  abPath,
  abcPath,
  invalidPath,
  dotPath,
});
