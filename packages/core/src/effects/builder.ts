import type { System } from "../shared/types";
import type { EffectFn } from "./types";
import { getValueByPath, setValueByPath } from "../shared/lib";
import { getTransformFunction, type Effect } from "./schema.zod";
import z from "zod";

function applyInstruction<TSystem extends System>(
  currentState: TSystem,
  effect: Effect<TSystem>
): TSystem {
  const { operation } = effect;
  const currentValue = getValueByPath(currentState, effect.path);
  let newValue: any;

  switch (operation) {
    case "copy":
      newValue = getValueByPath(currentState, effect.sourcePath);
      break;

    case "transform":
      const transformFn = getTransformFunction(effect);
      newValue = transformFn(currentValue, currentState);
      break;

    case "clear":
      newValue = [];
      break;

    case "unset":
      newValue = undefined;
      break;

    case "increment":
      newValue = z.number().parse(currentValue) + (effect.value ?? 1);
      break;

    case "decrement":
      newValue = z.number().parse(currentValue) - (effect.value ?? 1);
      break;

    case "append":
      const currentArray = z.array(z.any()).parse(currentValue);
      newValue = Array.isArray(effect.value)
        ? [...currentArray, ...effect.value]
        : [...currentArray, effect.value];
      break;

    case "prepend":
      const currentArrayPrepend = z.array(z.any()).parse(currentValue);
      newValue = Array.isArray(effect.value)
        ? [...effect.value, ...currentArrayPrepend]
        : [effect.value, ...currentArrayPrepend];
      break;

    case "remove":
      const currentArrayRemove = z.array(z.any()).parse(currentValue);
      newValue = currentArrayRemove.filter((item) => item !== effect.value);
      break;

    case "merge":
      const currentObject = z.record(z.string(), z.any()).parse(currentValue);
      newValue = { ...currentObject, ...effect.value };
      break;

    case "set":
      newValue = effect.value;
      break;

    default:
      throw new Error(`Unknown effect operation: ${operation}`);
  }
  return setValueByPath(currentState, effect.path, newValue);
}

export function compileEffect<TSystem extends System>(
  effects: Effect<TSystem>[]
): EffectFn<TSystem> {
  return (currentState: TSystem) => {
    // Clone the original state to avoid mutations
    let _currentState = { ...currentState };

    // Apply each instruction, but always pass the original state to transform functions
    for (const effect of effects) {
      _currentState = applyInstruction<TSystem>(_currentState, effect);
    }

    return _currentState;
  };
}
