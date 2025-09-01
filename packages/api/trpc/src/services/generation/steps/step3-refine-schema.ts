import { OpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { EntitiesResult } from "./step1-generate-entities";
import {
  JSONSchema,
  JSONSchemaMetaSchema,
} from "../../storage/domain/JSONSchema.entity";

const llm = new OpenAI({
  modelName: "gpt-4o",
  temperature: 0.1,
});

export interface JsonSchemaResult {
  jsonSchema: JSONSchema;
}

export async function refineEntitiesSchema(
  entitiesResult: EntitiesResult,
  maxRetries: number = 3
): Promise<JsonSchemaResult> {
  console.log("\n=== STEP 3: Refining Entities to JSON Schema ===");

  const basePrompt = `
Convert these rough entity definitions into a single, comprehensive JSON Schema that represents the complete system state.

Entities:
${entitiesResult.entities}

Create a JSON Schema object that:
1. Has a "type": "object" at the root
2. Contains a "properties" field with each entity as a property
3. Each entity property should be an object containing the entity's properties
4. Use appropriate JSON Schema types (string, number, boolean, object, array)
5. Include "required" arrays where appropriate
6. Add descriptions for clarity

Return only the JSON Schema object, no additional text.
`;

  let attempt = 1;
  let lastError: string | null = null;

  while (attempt <= maxRetries) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} - Generating JSON Schema`);

      let promptTemplate = basePrompt;
      if (lastError) {
        promptTemplate = `
${basePrompt}

IMPORTANT: The previous attempt failed with this error:
${lastError}

Please fix this issue and ensure the output is:
1. Valid JSON that can be parsed
2. A valid JSON Schema according to the JSON Schema specification
3. Uses only the supported JSON Schema features (object, array, string, number, integer, boolean, null types and composition with anyOf/oneOf/allOf)
`;
      }

      const jsonSchemaPrompt = PromptTemplate.fromTemplate(promptTemplate);
      const jsonSchemaChain = jsonSchemaPrompt.pipe(llm);

      const jsonSchemaResult = await jsonSchemaChain.invoke({
        entities: JSON.stringify(entitiesResult.entities, null, 2),
      });

      // Validate that the result can be parsed as JSON and matches JSONSchema
      try {
        const parsedSchema = JSON.parse(jsonSchemaResult);

        // Validate against our JSONSchema meta schema
        const validatedSchema = JSONSchemaMetaSchema.parse(parsedSchema);

        return { jsonSchema: validatedSchema };
      } catch (parseError) {
        lastError = `JSON parsing or schema validation failed: ${
          parseError instanceof Error ? parseError.message : String(parseError)
        }. The output was: ${jsonSchemaResult.substring(0, 200)}...`;
        console.warn(
          `Attempt ${attempt} failed - JSON parsing error:`,
          lastError
        );

        if (attempt === maxRetries) {
          throw new Error(
            `Failed to generate valid JSON Schema after ${maxRetries} attempts. Last error: ${lastError}`
          );
        }

        attempt++;
        continue;
      }
    } catch (error) {
      if (attempt === maxRetries) {
        console.error("Error in step 3 - refining entities schema:", error);
        throw new Error(
          `Failed to refine entities schema after ${maxRetries} attempts: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      lastError = `LLM invocation failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      console.warn(`Attempt ${attempt} failed - LLM error:`, lastError);
      attempt++;
    }
  }

  throw new Error(`Unexpected error: exceeded retry loop without throwing`);
}
