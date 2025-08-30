import {
  operationMaintainsType,
  symbolValue,
  type Symbol,
  type Value,
} from "./symbols";

export type Scalar = number | string | boolean | undefined | null;
export type Metadata = Record<string, Scalar>;

export type EffectFn<T extends object, S extends Symbol<T>> = (
  symbol: S,
  state: T
) => {
  name: string;
  value: Value<T, S>;
  cost?: number;
  meta?: Metadata;
};

export type EffectResult<T extends object, S extends Symbol<T>> = {
  name: string;
  value: Value<T, S>;
  cost?: number;
  meta?: Metadata;
};

type NumericSymbol<T extends object, S extends Symbol<T>> = Value<
  T,
  S
> extends number
  ? S
  : never;

type StringSymbol<T extends object, S extends Symbol<T>> = Value<
  T,
  S
> extends string
  ? S
  : never;

export type Effect<T extends object, S extends Symbol<T> = Symbol<T>> =
  | {
      name: string;
      symbol: S;
      operation: "set" | "unset";
      value: Value<T, S>;
      meta?: Metadata;
      cost?: number;
    }
  | {
      name: string;
      symbol: NumericSymbol<T, S>;
      operation: "add" | "subtract" | "multiply" | "divide";
      value: number;
      meta?: Metadata;
      cost?: number;
    }
  | {
      name: string;
      symbol: StringSymbol<T, S>;
      operation: "concat" | "prepend" | "append" | "replace";
      value: string;
      meta?: Metadata;
      cost?: number;
    }
  | {
      name: string;
      symbol: S;
      operation: "transform";
      value: EffectFn<T, S>;
      meta?: Metadata;
      cost?: number;
    };

function validateMutation<T extends object, S extends Symbol<T>>(
  newValue: Value<T, S>,
  symbol: S,
  state: T
): Value<T, S> {
  if (!operationMaintainsType(newValue, symbol, state)) {
    const currentValue = symbolValue(symbol, state);
    throw new Error(
      `Mutation of symbol '${String(
        symbol
      )}' resulted in incompatible type. Expected ${typeof currentValue}, got ${typeof newValue}`
    );
  }
  return newValue;
}

export function executableEffect<T extends object, S extends Symbol<T>>(
  effect: Effect<T, S>
): EffectFn<T, S> {
  return (symbol, state) => {
    const currentValue = symbolValue(symbol, state);

    const result: EffectResult<T, S> = {
      name: effect.name,
      value: currentValue,
      cost: effect.cost,
      meta: effect.meta,
    };

    switch (effect.operation) {
      case "set":
        result.value = effect.value;
        break;

      case "unset":
        result.value = undefined as Value<T, S>;
        break;

      // Numeric operations
      case "add":
        result.value = validateMutation(
          ((currentValue as number) + effect.value) as Value<T, S>,
          symbol,
          state
        );
        break;
      case "subtract":
        result.value = validateMutation(
          ((currentValue as number) - effect.value) as Value<T, S>,
          symbol,
          state
        );
        break;
      case "multiply":
        result.value = validateMutation(
          ((currentValue as number) * effect.value) as Value<T, S>,
          symbol,
          state
        );
        break;
      case "divide":
        result.value = validateMutation(
          ((currentValue as number) / effect.value) as Value<T, S>,
          symbol,
          state
        );
        break;
      // String operations
      case "concat":
        result.value = validateMutation(
          ((currentValue as string) + effect.value) as Value<T, S>,
          symbol,
          state
        );
        break;
      case "append":
        result.value = validateMutation(
          ((currentValue as string) + effect.value) as Value<T, S>,
          symbol,
          state
        );
        break;
      case "prepend":
        result.value = validateMutation(
          (effect.value + (currentValue as string)) as Value<T, S>,
          symbol,
          state
        );
        break;
      case "replace":
        result.value = validateMutation(
          (currentValue as string).replace(effect.value, "") as Value<T, S>,
          symbol,
          state
        );
        break;

      // Custom transformation
      case "transform":
        result.value = validateMutation(
          effect.value(symbol, state).value,
          symbol,
          state
        );
        break;

      default:
        throw new Error(
          `Invalid effect operation: ${(effect as any).operation}`
        );
    }

    return result;
  };
}
