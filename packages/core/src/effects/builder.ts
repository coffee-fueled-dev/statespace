import type { System } from "../shared/types";
import type { EffectInstruction, EffectDefinition, EffectFn } from "./types";
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

export function createEffectFunction<TSystem extends System>(
  effectDefinition: EffectDefinition<TSystem>
): EffectFn<TSystem> {
  return (currentState: TSystem) => {
    return applyEffectDefinition(currentState, effectDefinition);
  };
}
