import {
  type PathConstraint,
  type Validation,
  type Constraint,
} from "./schema.zod";
import type { PendingTransitionEvent } from "../transitions";
import type { ConstraintFn } from "./types";
import { getValueByPath } from "../shared/lib";
import { isBefore, isAfter, isWithinInterval } from "date-fns";
import type { System } from "../shared/types";

function validateValue(value: any, validation: Validation): boolean {
  switch (validation.type) {
    case "string":
      if (typeof value !== "string") return false;
      if (!validation.require) return true;

      if (Array.isArray(validation.require)) {
        return validation.require.every((requirement) => {
          switch (requirement.operator) {
            case "maxLength":
              return value.length <= requirement.args;
            case "minLength":
              return value.length >= requirement.args;
            case "length":
              return value.length === requirement.args;
            case "includes":
              return value.includes(requirement.args);
            case "startsWith":
              return value.startsWith(requirement.args);
            case "endsWith":
              return value.endsWith(requirement.args);
            case "lowercase":
              return value === value.toLowerCase();
            case "uppercase":
              return value === value.toUpperCase();
            default:
              return true;
          }
        });
      }
      return true;

    case "number":
      if (typeof value !== "number") return false;
      if (!validation.require) return true;

      if (Array.isArray(validation.require)) {
        return validation.require.every((requirement) => {
          switch (requirement.operator) {
            case "lt":
              return value < requirement.args;
            case "lte":
              return value <= requirement.args;
            case "gt":
              return value > requirement.args;
            case "gte":
              return value >= requirement.args;
            case "multipleOf":
              return value % requirement.args === 0;
            case "positive":
              return value > 0;
            case "negative":
              return value < 0;
            case "nonpositive":
              return value <= 0;
            case "nonnegative":
              return value >= 0;
            default:
              return true;
          }
        });
      }
      return true;

    case "boolean":
      if (typeof value !== "boolean") return false;
      if (!validation.require) return true;

      switch (validation.require.operator) {
        case "true":
          return value === true;
        case "false":
          return value === false;
        default:
          return true;
      }

    case "date":
      if (!(value instanceof Date)) return false;
      if (!validation.require) return true;

      switch (validation.require.operator) {
        case "before":
          return isBefore(value, validation.require.args);
        case "after":
          return isAfter(value, validation.require.args);
        case "between":
          return isWithinInterval(value, {
            start: validation.require.args.start,
            end: validation.require.args.end,
          });
        default:
          return true;
      }

    case "null":
      return value === null;

    case "array":
      if (!Array.isArray(value)) return false;
      if (!validation.require) return true;

      if (Array.isArray(validation.require)) {
        return validation.require.every((requirement) => {
          switch (requirement.operator) {
            case "nonempty":
              return value.length > 0;
            case "empty":
              return value.length === 0;
            default:
              return true;
          }
        });
      }
      return true;

    case "undefined":
      return value === undefined;

    default:
      return false;
  }
}

const validatePath = <TSystem extends System>(
  pathConstraint: PathConstraint
) => {
  return (systemState: TSystem) => {
    const path = pathConstraint.path;
    const value = getValueByPath(systemState, path);
    const require = pathConstraint.require;

    return validateValue(value, require);
  };
};

const validateConstraint =
  <TSystem extends System>(transitionEvent: PendingTransitionEvent<TSystem>) =>
  (constraint: Constraint<TSystem>) => {
    if (constraint.type === "path") {
      if (constraint.phase === "after_transition") {
        return validatePath(constraint)(transitionEvent.nextState);
      } else {
        return validatePath(constraint)(transitionEvent.currentState);
      }
    } else if (constraint.type === "cost") {
      return validateValue(transitionEvent.cost, constraint.require);
    } else if (constraint.type === "custom") {
      const result = constraint.require.require(transitionEvent);
      return result.allowed;
    }
    return false;
  };

export function compileConstraint<TSystem extends System>({
  constraints,
}: {
  constraints: Constraint<TSystem>[];
}): ConstraintFn<TSystem> {
  return (transitionEvent: PendingTransitionEvent<TSystem>) => {
    const allowed = constraints
      .map(validateConstraint(transitionEvent))
      .every((isValid) => isValid);

    return {
      allowed,
      errors: [],
    };
  };
}
