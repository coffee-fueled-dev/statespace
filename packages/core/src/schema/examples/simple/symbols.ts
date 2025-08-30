import { isSymbol, symbolValue, type Symbol } from "../../symbols";
import { state } from "./schemas/json-schema";
import { type System } from "./schemas/zod";

const a = symbolValue("a", state); // const a: { b: { c: number } }
const ab = symbolValue("a.b", state); // const ab: { c: number }
const abc = symbolValue("a.b.c", state); // const abc: number

const literalState = {
  a: {
    b: {
      c: 0,
    },
  },
} as const;
const constA = symbolValue("a", literalState); // const constA: { readonly b: { readonly c: 0 } }
const constAB = symbolValue("a.b", literalState); // const constAB: { readonly c: 0 }
const constABC = symbolValue("a.b.c", literalState); // const constABC: 0

console.log("Parsed values:", { a, ab, abc });
console.log("Literal values:", { constA, constAB, constABC });

type Symbols = Symbol<System>; // type Symbols = "a" | "a.b" | "a.b.c"

// These should now infer the correct boolean literal types at compile time
const aSymbol = isSymbol("a", state); // const aSymbol: true
const abSymbol = isSymbol("a.b", state); // const abSymbol: true
const abcSymbol = isSymbol("a.b.c", state); // const abcSymbol: true
const invalidSymbol = isSymbol("x.y.z", state); // const invalidSymbol: false
const dotSymbol = isSymbol(".", state); // const dotSymbol: false

console.log("Symbol checks:", {
  aSymbol,
  abSymbol,
  abcSymbol,
  invalidSymbol,
  dotSymbol,
});
