import { JsonSchemaResult } from "./step3-refine-schema";
import { RefinedTransitionsResult } from "./step4-refine-transitions";

export interface StateSpace {
  shape: any;
  transitions: any[];
}

export async function assembleStateSpace(
  jsonSchemaResult: JsonSchemaResult,
  refinedTransitionsResult: RefinedTransitionsResult
): Promise<StateSpace> {
  console.log("\n=== STEP 5: Final StateSpace Object ===");

  try {
    const finalStateSpace: StateSpace = {
      shape: JSON.parse(jsonSchemaResult.jsonSchema),
      transitions: refinedTransitionsResult.transitions,
    };

    console.log("Complete StateSpace:");
    console.log(JSON.stringify(finalStateSpace, null, 2));

    return finalStateSpace;
  } catch (error) {
    console.error("Error in step 5 - assembling statespace:", error);
    throw new Error(
      `Failed to assemble statespace: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
