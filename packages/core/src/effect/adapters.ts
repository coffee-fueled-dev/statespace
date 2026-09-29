import { PathRepository } from "../path/adapters";
import type { Path, PathReference, Value } from "../path/domain";
import type {
  Effect,
  EffectFailure,
  EffectSuccess,
  IEffectRepository,
  PathEffect,
  TransformEffect,
} from "./domain";
import { isPathEffect, isTransformEffect } from "./domain";
import { mergeValue, validateMutation } from "./libs";

export const EffectRepository: IEffectRepository = {
  apply: (state, transition, validator, context) => {
    try {
      const result = EffectRepository.makeExecutable(transition.effect)(state, context);

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
        errorMessage += `:\n${error.message}`;
      }
      return {
        success: false,
        error: errorMessage,
      } satisfies EffectFailure;
    }
  },

  resolveValue: (effect, state) => {
    type TState = typeof state;
    type TPath = Path<TState>;
    type TValue = Value<TState, TPath>;

    const maybeRef = effect.value as unknown;

    if (PathRepository.isPathRef(maybeRef, state)) {
      const pathRef = effect.value as PathReference<TState, TPath>;
      const path = pathRef.slice(1) as TPath;

      return PathRepository.valueFromPath(path, state) as TValue;
    } else {
      return effect.value as TValue;
    }
  },

  makeExecutable: (effect) => (state, context) => {
    type TState = typeof state;

    if (isTransformEffect(effect as Effect<TState>)) {
      const transformEffect = effect as TransformEffect<TState>;
      const transformResult = transformEffect.transform(state, context);
      if (transformResult.success) {
        return {
          success: true,
          state: transformResult.state,
        };
      }
      return {
        success: false,
        error: transformResult.error,
      } satisfies EffectFailure;
    }

    if (!isPathEffect(effect as Effect<TState>)) {
      throw new Error(`Invalid effect operation: ${(effect as { operation: string }).operation}`);
    }

    const pathEffect = effect as PathEffect<TState>;
    const path = pathEffect.path as Path<TState>;
    type TPath = typeof path;

    const currentValue = PathRepository.valueFromPath(path, state);

    function mergeAndValidate<TValue>(nextValue: TValue): EffectSuccess<TState> {
      const validatedValue = validateMutation(path, state, nextValue as Value<TState, TPath>);
      const nextState = mergeValue(state, path, validatedValue);

      return {
        success: true,
        state: nextState,
      };
    }

    const effectValue = EffectRepository.resolveValue(pathEffect, state);
    switch (pathEffect.operation) {
      case "set":
        return mergeAndValidate(effectValue);

      case "add":
        return mergeAndValidate(Number(currentValue) + Number(effectValue));

      case "subtract":
        return mergeAndValidate(Number(currentValue) - Number(effectValue));

      case "multiply":
        return mergeAndValidate(Number(currentValue) * Number(effectValue));

      case "divide":
        return mergeAndValidate(Number(currentValue) / Number(effectValue));

      case "append":
        return mergeAndValidate(String(currentValue) + String(effectValue));

      case "prepend":
        return mergeAndValidate(String(effectValue) + String(currentValue));

      case "cut":
        return mergeAndValidate(String(currentValue).replace(String(effectValue), ""));

      default:
        throw new Error(
          `Invalid effect operation: ${(pathEffect as { operation: string }).operation}`,
        );
    }
  },
} as const;
