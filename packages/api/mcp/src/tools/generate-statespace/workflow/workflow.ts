import { generateEntities } from "./steps/step1-generate-entities";
import { generateTransitions } from "./steps/step2-generate-transitions";
import { refineEntitiesSchema } from "./steps/step3-refine-schema";
import { refineTransitions } from "./steps/step4-refine-transitions";
import {
  assembleStateSpace,
  StateSpace,
} from "./steps/step5-assemble-statespace";
import { statespaceStorage } from "@statespace/sqlite";

export interface GenerationOptions {
  processName?: string;
  saveArtifacts?: boolean;
}

export async function generateStatespace(
  prompt: string,
  options: GenerationOptions = {}
): Promise<StateSpace & { processId?: string }> {
  const { processName = "Statespace Generation", saveArtifacts = true } =
    options;

  let processId: string | undefined;

  try {
    // Initialize storage if saving artifacts
    if (saveArtifacts) {
      processId = statespaceStorage.createProcess(processName, prompt);
      console.log(`Started process: ${processId}`);
    }

    // Step 1: Generate initial entities using rough schema
    const entitiesResult = await generateEntities(prompt);
    if (saveArtifacts && processId) {
      statespaceStorage.storeArtifact(
        processId,
        1,
        "Generate Entities",
        "entities",
        entitiesResult
      );
    }

    // Step 2: Generate rough transitions based on the entities
    const transitionsResult = await generateTransitions(entitiesResult);
    if (saveArtifacts && processId) {
      statespaceStorage.storeArtifact(
        processId,
        2,
        "Generate Transitions",
        "transitions",
        transitionsResult
      );
    }

    // Step 3: Refine entities into JSON Schema format
    const jsonSchemaResult = await refineEntitiesSchema(entitiesResult);
    if (saveArtifacts && processId) {
      statespaceStorage.storeArtifact(
        processId,
        3,
        "Refine Schema",
        "json_schema",
        jsonSchemaResult
      );
    }

    // Step 4: Refine transitions into structured Effect and Constraint format
    const refinedTransitionsResult = await refineTransitions(
      transitionsResult,
      jsonSchemaResult
    );
    if (saveArtifacts && processId) {
      statespaceStorage.storeArtifact(
        processId,
        4,
        "Refine Transitions",
        "refined_transitions",
        refinedTransitionsResult
      );
    }

    // Step 5: Create final StateSpace object
    const finalStateSpace = await assembleStateSpace(
      jsonSchemaResult,
      refinedTransitionsResult
    );
    if (saveArtifacts && processId) {
      statespaceStorage.storeArtifact(
        processId,
        5,
        "Assemble StateSpace",
        "final_statespace",
        finalStateSpace
      );

      // Mark process as completed
      statespaceStorage.completeProcess(processId);
      console.log(`Process completed: ${processId}`);
    }

    return { ...finalStateSpace, processId };
  } catch (error) {
    console.error("Error in generateStatespace workflow:", error);

    // Mark process as failed if we were saving artifacts
    if (saveArtifacts && processId) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      statespaceStorage.failProcess(processId, errorMessage);
      console.log(`Process failed: ${processId}`);
    }

    throw new Error(
      `Statespace generation failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
