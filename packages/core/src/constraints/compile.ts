import { type PathConstraint, type Constraint } from "./schema.zod";
import type { ConstraintFn } from "./types";
import { getValueByPath } from "../shared/lib";
import type { Schema, Validation } from "../schema/schema.zod";
import { makeExecutableValidator } from "../schema/compile";
import type { TransitionEvent } from "../transitions";
import type { Shape } from "../schema";
import type { ValidateFunction } from "ajv";

// Cache for compiled validators to avoid recompilation
// TODO: Add LRU Cache
const validatorCache = new Map<string, ValidateFunction>();

export function makeExecutableConstraint<TSchema extends Schema>({
  constraints,
}: {
  constraints: Constraint<TSchema>[];
}): ConstraintFn<TSchema> {
  return (transitionEvent: TransitionEvent<Shape<TSchema>>) => {
    const allowed = constraints
      .map(validateConstraint(transitionEvent))
      .every((isValid) => isValid);

    if (!allowed) {
      return {
        allowed,
        errors: ["Constraint not satisfied"],
      };
    }

    return {
      allowed,
    };
  };
}

function validateValue(value: any, validation: Validation): boolean {
  // Create a cache key from the validation object
  const cacheKey = JSON.stringify(validation);

  // Check if we already have a compiled validator
  let validator = validatorCache.get(cacheKey);

  if (!validator) {
    // Compile the validation schema using AJV
    const ajvValidator = makeExecutableValidator(validation);
    validator = ajvValidator;
    validatorCache.set(cacheKey, validator);
  }

  return validator(value);
}

const validatePath = <TShape extends Shape<Schema>>(
  pathConstraint: PathConstraint<TShape>
) => {
  return (systemState: TShape) => {
    const path = pathConstraint.path;
    const value = getValueByPath(systemState, path);
    const require = pathConstraint.require;

    return validateValue(value, require);
  };
};

const validateConstraint =
  <TSchema extends Schema>(transitionEvent: TransitionEvent<Shape<TSchema>>) =>
  (constraint: Constraint<TSchema>) => {
    if (constraint.type === "path") {
      if (constraint.phase === "after_transition") {
        return validatePath(constraint)(transitionEvent.nextState.shape);
      } else {
        return validatePath(constraint)(transitionEvent.currentState.shape);
      }
    } else if (constraint.type === "cost") {
      return validateValue(transitionEvent.cost, constraint.require);
    } else if (constraint.type === "custom") {
      const result = constraint.require.require(transitionEvent);
      return result.allowed;
    }
    return false;
  };
