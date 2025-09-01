import { OpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { EntitiesResult } from "./step1-generate-entities";

const llm = new OpenAI({
  modelName: "gpt-4o",
  temperature: 0.1,
});

export interface JsonSchemaResult {
  jsonSchema: string;
}

export async function refineEntitiesSchema(
  entitiesResult: EntitiesResult
): Promise<JsonSchemaResult> {
  console.log("\n=== STEP 3: Refining Entities to JSON Schema ===");

  try {
    const jsonSchemaPrompt = PromptTemplate.fromTemplate(`
Convert these rough entity definitions into a single, comprehensive JSON Schema that represents the complete system state.

Entities:
{entities}

Create a JSON Schema object that:
1. Has a "type": "object" at the root
2. Contains a "properties" field with each entity as a property
3. Each entity property should be an object containing the entity's properties
4. Use appropriate JSON Schema types (string, number, boolean, object, array)
5. Include "required" arrays where appropriate
6. Add descriptions for clarity

Return only the JSON Schema object, no additional text.
`);

    const jsonSchemaChain = jsonSchemaPrompt.pipe(llm);

    const jsonSchemaResult = await jsonSchemaChain.invoke({
      entities: JSON.stringify(entitiesResult.entities, null, 2),
    });

    console.log("JSON Schema for System:");
    console.log(jsonSchemaResult);

    return { jsonSchema: jsonSchemaResult };
  } catch (error) {
    console.error("Error in step 3 - refining entities schema:", error);
    throw new Error(
      `Failed to refine entities schema: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
