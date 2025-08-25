import type { EffectFn } from "./types";
import { getValueByPath, setValueByPath } from "../shared/lib";
import { getTransformFunction, type Effect } from "./schema.zod";
import z from "zod";
import { SerializableSchema } from "../shared/schema.zod";
import type { Schema, Shape } from "../schema";

export function makeExecutableEffect<TSchema extends Schema>({
  effects,
}: {
  effects: Effect<TSchema>[];
}): EffectFn<TSchema> {
  return (currentState: Shape<TSchema>) => {
    // Clone the original state to avoid mutations
    let _currentState = { ...currentState };

    // Apply each instruction, but always pass the original state to transform functions
    for (const effect of effects) {
      _currentState = applyInstruction<TSchema>(_currentState, effect);
    }

    return _currentState;
  };
}

function applyInstruction<TSchema extends Schema>(
  currentState: Shape<TSchema>,
  effect: Effect<TSchema>
): Shape<TSchema> {
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
      const currentArray = z.array(SerializableSchema).parse(currentValue);
      newValue = Array.isArray(effect.value)
        ? [...currentArray, ...effect.value]
        : [...currentArray, effect.value];
      break;

    case "prepend":
      const currentArrayPrepend = z
        .array(SerializableSchema)
        .parse(currentValue);
      newValue = Array.isArray(effect.value)
        ? [...effect.value, ...currentArrayPrepend]
        : [effect.value, ...currentArrayPrepend];
      break;

    case "remove":
      const currentArrayRemove = z
        .array(SerializableSchema)
        .parse(currentValue);
      newValue = currentArrayRemove.filter((item) => item !== effect.value);
      break;

    case "merge":
      const currentObject = z
        .record(z.string(), SerializableSchema)
        .parse(currentValue);
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
