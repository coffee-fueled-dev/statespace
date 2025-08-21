import type { System, EffectFn } from "../types";
import type { DeepKeys, PathValue } from "../constraints/types";
import type {
  EffectInstruction,
  EffectDefinition,
  EffectOperation,
  TransformType,
} from "./types";
import { createEffectFromConfig } from "./schema.zod";
import { getValueByPath, setValueByPath } from "../shared/schema.zod";

// Condition evaluation removed - use transition constraints instead

/**
 * Apply a single effect instruction using schema-based processing
 */
function applyInstruction<TSystem extends System>(
  currentState: TSystem,
  instruction: EffectInstruction<TSystem>,
  originalState: TSystem
): TSystem {
  // Convert to JSON format for schema-based processing
  const jsonInstruction: any = {
    path: instruction.path as string,
    operation: instruction.operation,
    value: instruction.value,
    sourcePath: instruction.sourcePath as string,
  };

  // Handle transform operations
  if (instruction.operation === "transform") {
    if (instruction.transformFn) {
      // Custom transform function - handle manually
      const currentValue = getValueByPath(
        currentState,
        instruction.path as string
      );
      const newValue = instruction.transformFn(currentValue, originalState);
      return setValueByPath(currentState, instruction.path as string, newValue);
    } else if (instruction.transformType) {
      // Predefined transform - use schema processing
      jsonInstruction.transformType = instruction.transformType;
    } else {
      throw new Error(
        "Transform operation requires either transformFn or transformType"
      );
    }
  }

  // Use the schema's createEffectFromConfig to process the instruction
  // This leverages all the validation and processing logic from the schema
  try {
    const effect = createEffectFromConfig<TSystem>(jsonInstruction);
    return effect(currentState);
  } catch (error) {
    // Fallback to manual processing for operations that need original state context
    return applyInstructionManual(currentState, instruction, originalState);
  }
}

/**
 * Manual instruction processing for cases that need original state context
 */
function applyInstructionManual<TSystem extends System>(
  currentState: TSystem,
  instruction: EffectInstruction<TSystem>,
  originalState: TSystem
): TSystem {
  const { path, operation, sourcePath } = instruction;
  let newValue: any;

  switch (operation) {
    case "copy":
      if (!sourcePath)
        throw new Error("sourcePath required for copy operation");
      newValue = getValueByPath(originalState, sourcePath as string);
      break;

    default:
      throw new Error(
        `Unsupported operation for manual processing: ${operation}`
      );
  }

  return setValueByPath(currentState, path as string, newValue);
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
   * Create a conditional effect with a function-based condition
   * NOTE: For JSON configs, use transition constraints instead
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

  // Conditional effects removed - use transition constraints instead

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
    transformFn?: (currentValue: any, state: TSystem) => any,
    transformType?: TransformType
  ): EffectBuilder<TSystem> {
    this.parent.addInstruction({
      path: this.path as DeepKeys<TSystem>,
      operation,
      value,
      sourcePath: sourcePath as DeepKeys<TSystem>,
      transformFn,
      transformType,
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
   * Apply a custom transformation function
   */
  transform(
    transformFn: (currentValue: TValue, state: TSystem) => TValue
  ): EffectBuilder<TSystem> {
    return this.addInstruction("transform", undefined, undefined, transformFn);
  }

  /**
   * Apply a predefined transformation
   */
  transformWith(transformType: TransformType): EffectBuilder<TSystem> {
    return this.addInstruction(
      "transform",
      undefined,
      undefined,
      undefined,
      transformType
    );
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
