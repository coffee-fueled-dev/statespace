import { OpenAI } from "@langchain/openai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { EntitySchema } from "../../schemas/rough/entity.zod";
import { z } from "zod";

const llm = new OpenAI({
  modelName: "gpt-4o",
  temperature: 0.7,
});

export interface EntitiesResult {
  entities: z.infer<typeof EntitySchema>[];
}

export async function generateEntities(
  prompt: string
): Promise<EntitiesResult> {
  console.log("=== STEP 1: Generating Initial Entities ===");

  try {
    const entityParser = StructuredOutputParser.fromZodSchema(
      z.object({
        entities: z.array(EntitySchema),
      })
    );

    const entityPrompt = PromptTemplate.fromTemplate(prompt);

    const entityChain = entityPrompt.pipe(llm).pipe(entityParser);

    const entitiesResult = await entityChain.invoke({
      format_instructions: entityParser.getFormatInstructions(),
    });

    console.log("Generated Entities:");
    console.log(JSON.stringify(entitiesResult, null, 2));

    return entitiesResult;
  } catch (error) {
    console.error("Error in step 1 - generating entities:", error);
    throw new Error(
      `Failed to generate entities: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
