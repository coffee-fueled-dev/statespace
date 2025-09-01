import { JsonSchemaResult } from "./step3-refine-schema";
import { RefinedTransitionsResult } from "./step4-refine-transitions";
import {
  RefinedStateSpace,
  RefinedStateSpaceSchema,
} from "../../storage/domain/RefinedStateSpace.entity";

export async function assembleStateSpace(
  jsonSchemaResult: JsonSchemaResult,
  refinedTransitionsResult: RefinedTransitionsResult
): Promise<RefinedStateSpace> {
  console.log("\n=== STEP 5: Final StateSpace Object ===");

  try {
    return RefinedStateSpaceSchema.parse({
      shape: jsonSchemaResult.jsonSchema,
      transitions: refinedTransitionsResult.transitions,
    });
  } catch (error) {
    console.error("Error in step 5 - assembling statespace:", error);
    throw new Error(
      `Failed to assemble statespace: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
