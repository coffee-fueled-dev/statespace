import { PathRepository } from "../path/adapters";
import type { Path, PathReference, Value } from "../path/domain";
import type { EffectFailure, EffectSuccess, IEffectRepository } from "./domain";
import { mergeValue, validateMutation } from "./libs";

export const EffectRepository: IEffectRepository = {
  apply: (state, path, transition, validator) => {
    type TState = typeof state;

    try {
      const result = EffectRepository.makeExecutable(transition.effect)(
        path,
        state
      );

      if (!result.success) {
        return result;
      }

      // TODO: return validation error messages if any
      if (!validator(result.state)) {
        return {
          success: false,
          error: "Malformed state after effect",
        } satisfies EffectFailure;
      }

      return result;
    } catch (error) {
      let errorMessage = "Failed to apply effect";
      if (error instanceof Error) {
        errorMessage += ":\n" + error.message;
      }
      return {
        success: false,
        error: errorMessage,
      } satisfies EffectFailure;
    }
  },

  createImperative: (fn) => (path, state) => {
    const value = PathRepository.valueFromPath(path, state);
    const result = fn(value, state);
    return result;
  },

  resolveValue: (effect, state) => {
    type TState = typeof state;
    type TPath = Path<TState>;
    type TValue = Value<TState, TPath>;

    const maybeRef = effect.value as unknown;

    if (PathRepository.isPathRef(maybeRef, state)) {
      const pathRef = effect.value as PathReference<TState, TPath>;
      const path = pathRef.slice(1) as TPath;

      const keys = path.split(".");

      let current: any = state;
      for (const key of keys) {
        if (current && typeof current === "object" && key in current) {
          current = current[key];
        } else {
          return undefined as any;
        }
      }

      return current as TValue;
    } else {
      return effect.value as TValue;
    }
  },

  makeExecutable: (effect) => (path, state) => {
    type TState = typeof state;
    type TPath = typeof path;

    const currentValue = PathRepository.valueFromPath(path, state);

    function mergeAndValidate<TValue extends unknown>(
      nextValue: TValue
    ): EffectSuccess<TState> {
      const validatedValue = validateMutation(
        path,
        state,
        nextValue as Value<TState, TPath>
      );
      const nextState = mergeValue(state, path, validatedValue);

      return {
        success: true,
        state: nextState,
        // effect: effect,
      };
    }

    const effectValue = EffectRepository.resolveValue(effect, state);
    switch (effect.operation) {
      case "set":
        return mergeAndValidate(effectValue);

      // Numeric operations
      case "add":
        return mergeAndValidate(Number(currentValue) + Number(effectValue));

      case "subtract":
        return mergeAndValidate(Number(currentValue) - Number(effectValue));

      case "multiply":
        return mergeAndValidate(Number(currentValue) * Number(effectValue));

      case "divide":
        return mergeAndValidate(Number(currentValue) / Number(effectValue));

      // String operations
      case "append":
        return mergeAndValidate(String(currentValue) + String(effectValue));

      case "prepend":
        return mergeAndValidate(String(effectValue) + String(currentValue));

      case "cut":
        return mergeAndValidate(
          String(currentValue).replace(String(effectValue), "")
        );

      // Custom transformation
      case "transform":
        const transformResult = effect.value(path, state);
        if (transformResult.success) {
          return {
            success: true,
            state: transformResult.state,
            effect: effect,
          };
        } else {
          return {
            success: false,
            // effect,
            error: transformResult.error,
          } satisfies EffectFailure;
        }

      default:
        throw new Error(
          `Invalid effect operation: ${(effect as any).operation}`
        );
    }
  },
} as const;
