import {
  isPath,
  operationMaintainsType,
  pathValue,
  type Path,
  type Value,
} from "./paths";

export type Scalar = number | string | boolean | undefined | null;
export type Metadata = Record<string, Scalar>;

export type EffectFn<T extends object, S extends Path<T>> = (
  path: S,
  state: T
) => {
  name: string;
  value: Value<T, S>;
  cost?: number;
  meta?: Metadata;
};

export type EffectResult<T extends object, S extends Path<T>> = {
  name: string;
  value: Value<T, S>;
  cost?: number;
  meta?: Metadata;
};

type NumericPath<T extends object, S extends Path<T>> = Value<
  T,
  S
> extends number
  ? S
  : never;

type StringPath<T extends object, S extends Path<T>> = Value<
  T,
  S
> extends string
  ? S
  : never;

export type Effect<T extends object, S extends Path<T> = Path<T>> =
  | {
      name: string;
      path: S;
      operation: "set";
      value: Value<T, S> | `$${Path<T>}`;
      meta?: Metadata;
      cost?: number;
    }
  | {
      name: string;
      path: NumericPath<T, S>;
      operation: "add" | "subtract" | "multiply" | "divide";
      value: number;
      meta?: Metadata;
      cost?: number;
    }
  | {
      name: string;
      path: StringPath<T, S>;
      operation: "concat" | "prepend" | "append" | "cut";
      value: string;
      meta?: Metadata;
      cost?: number;
    }
  | {
      name: string;
      path: S;
      operation: "transform";
      value: EffectFn<T, S>;
      meta?: Metadata;
      cost?: number;
    };

function validateMutation<T extends object, S extends Path<T>>(
  newValue: Value<T, S>,
  path: S,
  state: T
): Value<T, S> {
  if (!operationMaintainsType(newValue, path, state)) {
    const currentValue = pathValue(path, state);
    throw new Error(
      `Mutation of path '${String(
        path
      )}' resulted in incompatible type. Expected ${typeof currentValue}, got ${typeof newValue}`
    );
  }
  return newValue;
}

export function executableEffect<T extends object, S extends Path<T>>(
  effect: Effect<T, S>
): EffectFn<T, S> {
  return (path, state) => {
    const currentValue = pathValue(path, state);

    const result: EffectResult<T, S> = {
      name: effect.name,
      value: currentValue,
      cost: effect.cost,
      meta: effect.meta,
    };

    switch (effect.operation) {
      case "set":
        if (typeof effect.value === "string" && effect.value.startsWith("$")) {
          const referencedPath = effect.value.slice(1) as Path<T>;
          if (!isPath(referencedPath, state)) {
            throw new Error(
              `Referenced path '${String(referencedPath)}' not found in state`
            );
          }
          result.value = validateMutation(
            pathValue(referencedPath, state) as Value<T, S>,
            path,
            state
          );
        } else {
          result.value = effect.value as Value<T, S>;
        }
        break;

      // Numeric operations
      case "add":
        result.value = validateMutation(
          ((currentValue as number) + effect.value) as Value<T, S>,
          path,
          state
        );
        break;
      case "subtract":
        result.value = validateMutation(
          ((currentValue as number) - effect.value) as Value<T, S>,
          path,
          state
        );
        break;
      case "multiply":
        result.value = validateMutation(
          ((currentValue as number) * effect.value) as Value<T, S>,
          path,
          state
        );
        break;
      case "divide":
        result.value = validateMutation(
          ((currentValue as number) / effect.value) as Value<T, S>,
          path,
          state
        );
        break;
      // String operations
      case "concat":
        result.value = validateMutation(
          ((currentValue as string) + effect.value) as Value<T, S>,
          path,
          state
        );
        break;
      case "append":
        result.value = validateMutation(
          ((currentValue as string) + effect.value) as Value<T, S>,
          path,
          state
        );
        break;
      case "prepend":
        result.value = validateMutation(
          (effect.value + (currentValue as string)) as Value<T, S>,
          path,
          state
        );
        break;
      case "cut":
        result.value = validateMutation(
          (currentValue as string).replace(effect.value, "") as Value<T, S>,
          path,
          state
        );
        break;

      // Custom transformation
      case "transform":
        result.value = validateMutation(
          effect.value(path, state).value,
          path,
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
