import { generateEntities } from "./steps/step1-generate-entities";
import { generateTransitions } from "./steps/step2-generate-transitions";
import { refineEntitiesSchema } from "./steps/step3-refine-schema";
import { refineTransitions } from "./steps/step4-refine-transitions";
import { assembleStateSpace } from "./steps/step5-assemble-statespace";
import { statespaceStorage } from "../storage/database";
import { GenerationEvent } from "../storage/domain/GenerationEvent.entity";

export interface GenerationOptions {
  processName?: string;
  saveArtifacts?: boolean;
  onProgress?: (step: number, stepName: string, artifact?: any) => void;
}

export async function* generateStatespaceStream(
  prompt: string,
  options: GenerationOptions = {}
): AsyncGenerator<GenerationEvent, void, unknown> {
  const { processName = "Statespace Generation", saveArtifacts = true } =
    options;
  const processId = crypto.randomUUID();

  try {
    // Create process_created event
    const processCreatedEvent: GenerationEvent = {
      type: "process_created",
      processId,
      processName,
      originalPrompt: prompt,
      createdAt: new Date().toISOString(),
    };

    if (saveArtifacts) {
      statespaceStorage.storeEvent(processCreatedEvent);
      console.log(`Started process: ${processId}`);
    }
    yield processCreatedEvent;

    // Emit started event
    const startedEvent: GenerationEvent = {
      type: "started",
      processId,
      step: 0,
      stepName: "Started",
    };

    if (saveArtifacts) {
      statespaceStorage.storeEvent(startedEvent);
    }
    yield startedEvent;

    // Step 1: Generate initial entities using rough schema
    const step1Start: GenerationEvent = {
      type: "progress",
      processId,
      step: 1,
      stepName: "Generate Entities",
    };
    if (saveArtifacts) {
      statespaceStorage.storeEvent(step1Start);
    }
    yield step1Start;

    const entitiesResult = await generateEntities(prompt);
    const step1Complete: GenerationEvent = {
      type: "progress",
      processId,
      step: 1,
      stepName: "Generate Entities",
      artifact: { type: "RoughEntityList", data: entitiesResult.entities },
    };

    if (saveArtifacts) {
      statespaceStorage.storeEvent(step1Complete);
    }
    yield step1Complete;

    // Step 2: Generate rough transitions based on the entities
    const step2Start: GenerationEvent = {
      type: "progress",
      processId,
      step: 2,
      stepName: "Generate Transitions",
    };
    if (saveArtifacts) {
      statespaceStorage.storeEvent(step2Start);
    }
    yield step2Start;

    const transitionsResult = await generateTransitions(entitiesResult);
    const step2Complete: GenerationEvent = {
      type: "progress",
      processId,
      step: 2,
      stepName: "Generate Transitions",
      artifact: {
        type: "RoughTransitionList",
        data: transitionsResult.transitions,
      },
    };
    if (saveArtifacts) {
      statespaceStorage.storeEvent(step2Complete);
    }
    yield step2Complete;

    // Step 3: Refine entities into JSON Schema format
    const step3Start: GenerationEvent = {
      type: "progress",
      processId,
      step: 3,
      stepName: "Refine Schema",
    };
    if (saveArtifacts) {
      statespaceStorage.storeEvent(step3Start);
    }
    yield step3Start;

    const jsonSchemaResult = await refineEntitiesSchema(entitiesResult);
    const step3Complete: GenerationEvent = {
      type: "progress",
      processId,
      step: 3,
      stepName: "Refine Schema",
      artifact: { type: "RefinedShape", data: jsonSchemaResult.jsonSchema },
    };

    if (saveArtifacts) {
      statespaceStorage.storeEvent(step3Complete);
    }
    yield step3Complete;

    // Step 4: Refine transitions into structured Effect and Constraint format
    const step4Start: GenerationEvent = {
      type: "progress",
      processId,
      step: 4,
      stepName: "Refine Transitions",
    };
    if (saveArtifacts) {
      statespaceStorage.storeEvent(step4Start);
    }
    yield step4Start;

    const refinedTransitionsResult = await refineTransitions(
      transitionsResult,
      jsonSchemaResult
    );

    const step4Complete: GenerationEvent = {
      type: "progress",
      processId,
      step: 4,
      stepName: "Refine Transitions",
      artifact: {
        type: "RefinedTransitionList",
        data: refinedTransitionsResult.transitions,
      },
    };
    if (saveArtifacts) {
      statespaceStorage.storeEvent(step4Complete);
    }
    yield step4Complete;

    // Step 5: Create final StateSpace object
    const step5Start: GenerationEvent = {
      type: "progress",
      processId,
      step: 5,
      stepName: "Assemble StateSpace",
    };
    if (saveArtifacts) {
      statespaceStorage.storeEvent(step5Start);
    }
    yield step5Start;

    const refinedStateSpace = await assembleStateSpace(
      jsonSchemaResult,
      refinedTransitionsResult
    );

    const step5Complete: GenerationEvent = {
      type: "progress",
      processId,
      step: 5,
      stepName: "Assemble StateSpace",
      artifact: {
        type: "RefinedStateSpace",
        data: refinedStateSpace,
      },
    };
    if (saveArtifacts) {
      statespaceStorage.storeEvent(step5Complete);
    }
    yield step5Complete;

    const completedEvent: GenerationEvent = {
      type: "completed",
      processId,
      result: { success: true, stateSpace: refinedStateSpace },
    };

    if (saveArtifacts) {
      statespaceStorage.storeEvent(completedEvent);
      console.log(`Process completed: ${processId}`);
    }
    yield completedEvent;
  } catch (error) {
    console.error("Error in generateStatespace workflow:", error);

    const errorEvent: GenerationEvent = {
      type: "error",
      processId,
      error: error instanceof Error ? error.message : String(error),
    };

    if (saveArtifacts) {
      statespaceStorage.storeEvent(errorEvent);
      console.log(`Process failed: ${processId}`);
    }
    yield errorEvent;
  }
}
