import type { System, EffectFn } from "../types";
import type { DeepKeys, PathValue } from "../constraints/types";
import type {
  EffectInstruction,
  EffectDefinition,
  EffectOperation,
} from "./types";

/**
 * Utility function to set a value at a path in an object
 */
function setValueByPath<T>(obj: T, path: string, value: any): T {
  const pathParts = path.split(".");
  const result = JSON.parse(JSON.stringify(obj)); // Deep clone

  let current = result;
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (!(part in current) || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part];
  }

  const lastPart = pathParts[pathParts.length - 1];
  current[lastPart] = value;

  return result;
}

/**
 * Utility function to get a value from an object using dot notation
 */
function getValueByPath<T>(obj: T, path: string): any {
  return path.split(".").reduce((current: any, key: string) => {
    return current && typeof current === "object" ? current[key] : undefined;
  }, obj);
}

/**
 * Apply a single effect instruction to the state
 */
function applyInstruction<TSystem extends System>(
  currentState: TSystem,
  instruction: EffectInstruction<TSystem>,
  originalState: TSystem
): TSystem {
  const { path, operation, value, sourcePath, transformFn, condition } =
    instruction;

  // Check condition if provided (use original state for condition)
  if (condition && !condition(originalState)) {
    return currentState;
  }

  const currentValue = getValueByPath(currentState, path);
  let newValue: any;

  switch (operation) {
    case "set":
      newValue = value;
      break;

    case "unset":
      newValue = undefined;
      break;

    case "copy":
      if (!sourcePath)
        throw new Error("sourcePath required for copy operation");
      // Copy from original state, not current state
      newValue = getValueByPath(originalState, sourcePath);
      break;

    case "increment":
      newValue =
        (typeof currentValue === "number" ? currentValue : 0) + (value || 1);
      break;

    case "decrement":
      newValue =
        (typeof currentValue === "number" ? currentValue : 0) - (value || 1);
      break;

    case "append":
      if (!Array.isArray(currentValue)) {
        newValue = Array.isArray(value) ? value : [value];
      } else {
        newValue = Array.isArray(value)
          ? [...currentValue, ...value]
          : [...currentValue, value];
      }
      break;

    case "prepend":
      if (!Array.isArray(currentValue)) {
        newValue = Array.isArray(value) ? value : [value];
      } else {
        newValue = Array.isArray(value)
          ? [...value, ...currentValue]
          : [value, ...currentValue];
      }
      break;

    case "remove":
      if (!Array.isArray(currentValue)) {
        newValue = [];
      } else {
        if (typeof value === "function") {
          newValue = currentValue.filter((item) => !value(item));
        } else {
          newValue = currentValue.filter((item) => item !== value);
        }
      }
      break;

    case "clear":
      newValue = [];
      break;

    case "merge":
      if (
        typeof currentValue === "object" &&
        currentValue !== null &&
        !Array.isArray(currentValue)
      ) {
        newValue = { ...currentValue, ...value };
      } else {
        newValue = value;
      }
      break;

    case "transform":
      if (!transformFn)
        throw new Error("transformFn required for transform operation");
      // Pass both current value and original state to transform function
      newValue = transformFn(currentValue, originalState);
      break;

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  return setValueByPath(currentState, path, newValue);
}

/**
 * Apply all effect instructions to create the new state
 * All transformations receive the original state for reference
 */
function applyEffectDefinition<TSystem extends System>(
  originalState: TSystem,
  definition: EffectDefinition<TSystem>
): TSystem {
  // Clone the original state to avoid mutations
  let currentState = JSON.parse(JSON.stringify(originalState));

  // Apply each instruction, but always pass the original state to transform functions
  for (const instruction of definition.instructions) {
    currentState = applyInstruction(currentState, instruction, originalState);
  }

  return currentState;
}

/**
 * Internal effect builder implementation
 */
class EffectBuilderImpl<TSystem extends System> {
  private instructions: EffectInstruction<TSystem>[] = [];

  /**
   * Start building an effect for a specific path
   */
  path<Path extends DeepKeys<TSystem>>(
    path: Path
  ): PathEffectBuilder<TSystem, PathValue<TSystem, Path>> {
    return new PathEffectBuilder<TSystem, PathValue<TSystem, Path>>(
      this as any,
      path as string
    );
  }

  /**
   * Add an instruction to the builder
   */
  addInstruction(instruction: EffectInstruction<TSystem>): this {
    this.instructions.push(instruction);
    return this;
  }

  /**
   * Create a conditional effect
   */
  when(
    condition: (state: TSystem) => boolean,
    builderFn: (builder: EffectBuilderImpl<TSystem>) => void
  ): this {
    const conditionalBuilder = new EffectBuilderImpl<TSystem>();
    builderFn(conditionalBuilder);

    // Add condition to all instructions from the nested builder
    conditionalBuilder.instructions.forEach((instruction) => {
      this.addInstruction({
        ...instruction,
        condition: condition,
      });
    });

    return this;
  }

  /**
   * Get the effect function
   */
  getEffectFunction(): EffectFn<TSystem> {
    const definition: EffectDefinition<TSystem> = {
      instructions: this.instructions,
    };

    return (state: TSystem) => {
      return applyEffectDefinition(state, definition);
    };
  }

  /**
   * Build the final effect function
   */
  build(): EffectFn<TSystem> {
    return this.getEffectFunction();
  }
}

/**
 * Combined type: effect function + builder methods
 */
export type EffectBuilder<TSystem extends System> = EffectFn<TSystem> &
  EffectBuilderImpl<TSystem>;

/**
 * Path-specific effect builder for type-safe operations
 */
export class PathEffectBuilder<TSystem extends System, TValue> {
  constructor(private parent: EffectBuilder<TSystem>, private path: string) {}

  private addInstruction(
    operation: EffectOperation,
    value?: any,
    sourcePath?: string,
    transformFn?: (currentValue: any, state: TSystem) => any
  ): EffectBuilder<TSystem> {
    this.parent.addInstruction({
      path: this.path as DeepKeys<TSystem>,
      operation,
      value,
      sourcePath: sourcePath as DeepKeys<TSystem>,
      transformFn,
    });
    return this.parent;
  }

  /**
   * Set the value at this path
   */
  set(value: TValue): EffectBuilder<TSystem> {
    return this.addInstruction("set", value);
  }

  /**
   * Clear/unset the value at this path
   */
  unset(): EffectBuilder<TSystem> {
    return this.addInstruction("unset");
  }

  /**
   * Copy value from another path
   */
  copyFrom<SourcePath extends DeepKeys<TSystem>>(
    sourcePath: SourcePath
  ): EffectBuilder<TSystem> {
    return this.addInstruction("copy", undefined, sourcePath);
  }

  /**
   * Increment a numeric value
   */
  increment(amount: number = 1): EffectBuilder<TSystem> {
    return this.addInstruction("increment", amount);
  }

  /**
   * Decrement a numeric value
   */
  decrement(amount: number = 1): EffectBuilder<TSystem> {
    return this.addInstruction("decrement", amount);
  }

  /**
   * Apply a custom transformation
   */
  transform(
    transformFn: (currentValue: TValue, state: TSystem) => TValue
  ): EffectBuilder<TSystem> {
    return this.addInstruction("transform", undefined, undefined, transformFn);
  }

  // Array-specific methods
  /**
   * Append item(s) to an array
   */
  append(
    items: TValue extends (infer U)[] ? U | U[] : never
  ): EffectBuilder<TSystem> {
    return this.addInstruction("append", items);
  }

  /**
   * Prepend item(s) to an array
   */
  prepend(
    items: TValue extends (infer U)[] ? U | U[] : never
  ): EffectBuilder<TSystem> {
    return this.addInstruction("prepend", items);
  }

  /**
   * Remove items from an array
   */
  remove(
    predicate: TValue extends (infer U)[] ? U | ((item: U) => boolean) : never
  ): EffectBuilder<TSystem> {
    return this.addInstruction("remove", predicate);
  }

  /**
   * Clear an array
   */
  clear(): EffectBuilder<TSystem> {
    return this.addInstruction("clear");
  }

  // Object-specific methods
  /**
   * Merge properties into an object
   */
  merge(
    properties: TValue extends object ? Partial<TValue> : never
  ): EffectBuilder<TSystem> {
    return this.addInstruction("merge", properties);
  }
}

/**
 * Factory function to create a new effect builder that's also callable as an effect function
 */
export function effect<TSystem extends System>(): EffectBuilder<TSystem> {
  const impl = new EffectBuilderImpl<TSystem>();

  // Create a function that can be called as an effect
  const effectFn = (state: TSystem) => {
    return impl.getEffectFunction()(state);
  };

  // Copy all methods from the implementation to the function
  Object.setPrototypeOf(effectFn, EffectBuilderImpl.prototype);
  Object.assign(effectFn, impl);

  return effectFn as EffectBuilder<TSystem>;
}
