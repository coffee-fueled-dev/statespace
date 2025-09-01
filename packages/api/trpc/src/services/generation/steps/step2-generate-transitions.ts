import { OpenAI } from "@langchain/openai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RoughTransitionSchema } from "../../storage/domain/RoughTransition.entity";
import { z } from "zod";
import { EntitiesResult } from "./step1-generate-entities";

const llm = new OpenAI({
  modelName: "gpt-4o",
  temperature: 0.7,
});

export type TransitionsResult = z.infer<typeof TransitionResultSchema>;
export const TransitionResultSchema = z.object({
  transitions: z.array(RoughTransitionSchema),
});

export async function generateTransitions(
  entitiesResult: EntitiesResult
): Promise<TransitionsResult> {
  console.log("\n=== STEP 2: Generating Rough Transitions ===");

  try {
    const transitionParser = StructuredOutputParser.fromZodSchema(
      TransitionResultSchema
    );

    const transitionPrompt = PromptTemplate.fromTemplate(`
Based on these entities from a shopping trip system:
${entitiesResult.entities}

Generate transitions that describe how the system changes. Think about actions like:
- Adding money to wallet
- Adding items to shopping cart
- Making purchases
- Removing items from inventory
- Creating new entities

For each transition:
- Describe the effect (how properties change)
- Describe the constraints (what must be true for this transition to happen)

${transitionParser.getFormatInstructions()}
`);

    const transitionChain = transitionPrompt.pipe(llm).pipe(transitionParser);

    const transitionsResult = await transitionChain.invoke({
      entities: JSON.stringify(entitiesResult.entities, null, 2),
      format_instructions: transitionParser.getFormatInstructions(),
    });

    return transitionsResult;
  } catch (error) {
    console.error("Error in step 2 - generating transitions:", error);
    throw new Error(
      `Failed to generate transitions: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
