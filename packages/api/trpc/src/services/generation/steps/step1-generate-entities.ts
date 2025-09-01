import { OpenAI } from "@langchain/openai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RoughEntitySchema } from "../../storage/domain/RoughEntity.entity";
import { z } from "zod";

const llm = new OpenAI({
  modelName: "gpt-4o",
  temperature: 0.7,
});

export type EntitiesResult = z.infer<typeof EntitiesResultSchema>;
export const EntitiesResultSchema = z.object({
  entities: z.array(RoughEntitySchema),
});

export async function generateEntities(
  prompt: string
): Promise<EntitiesResult> {
  console.log("=== STEP 1: Generating Initial Entities ===");

  try {
    const entityParser =
      StructuredOutputParser.fromZodSchema(EntitiesResultSchema);

    const entityPrompt = PromptTemplate.fromTemplate(prompt);

    const entityChain = entityPrompt.pipe(llm).pipe(entityParser);

    const entitiesResult = await entityChain.invoke({
      format_instructions: entityParser.getFormatInstructions(),
    });

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
