import {
  encode,
  decode,
  permutationToInternalState,
  type Element,
  type InternalSystemState,
} from "@statespace/core";
import { boundedPathSearch } from "@statespace/analysis/bfs";
import { cardGamePositionHandlers } from "../plugins/cardgame-mechanics.js";
import { cardGameConfig } from "../typescript/config.js";

async function main() {
  const getState = (index: number) => {
    const permutation = decode(index, cardGameConfig.elementBank);
    return permutationToInternalState(permutation, cardGameConfig.containers);
  };

  const encodeState = (state: InternalSystemState) => {
    const permutation: Element[] = [];
    state.containers.forEach((container) => {
      permutation.push(...container.slots);
    });
    return encode(permutation, cardGameConfig.elementBank);
  };

  const result = await boundedPathSearch(
    getState,
    encodeState,
    cardGamePositionHandlers,
    100,
    {
      target: 200,
      stepLimit: 8,
      visitLimit: 1000,
      timeLimit: 5000,
    }
  );

  return result;
}

if (import.meta.main) {
  main().catch(console.error);
}
