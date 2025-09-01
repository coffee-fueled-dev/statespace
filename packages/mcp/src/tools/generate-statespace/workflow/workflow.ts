import { generateEntities } from "./steps/step1-generate-entities";
import { generateTransitions } from "./steps/step2-generate-transitions";
import { refineEntitiesSchema } from "./steps/step3-refine-schema";
import { refineTransitions } from "./steps/step4-refine-transitions";
import {
  assembleStateSpace,
  StateSpace,
} from "./steps/step5-assemble-statespace";

export async function generateStatespace(prompt: string): Promise<StateSpace> {
  try {
    // Step 1: Generate initial entities using rough schema
    const entitiesResult = await generateEntities(prompt);

    // Step 2: Generate rough transitions based on the entities
    const transitionsResult = await generateTransitions(entitiesResult);

    // Step 3: Refine entities into JSON Schema format
    const jsonSchemaResult = await refineEntitiesSchema(entitiesResult);

    // Step 4: Refine transitions into structured Effect and Constraint format
    const refinedTransitionsResult = await refineTransitions(
      transitionsResult,
      jsonSchemaResult
    );

    // Step 5: Create final StateSpace object
    const finalStateSpace = await assembleStateSpace(
      jsonSchemaResult,
      refinedTransitionsResult
    );

    return finalStateSpace;
  } catch (error) {
    console.error("Error in generateStatespace workflow:", error);
    throw new Error(
      `Statespace generation failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
