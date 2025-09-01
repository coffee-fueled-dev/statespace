import { OpenAI } from "@langchain/openai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { TransitionSchema } from "../../schemas/rough/transition.zod";
import { z } from "zod";
import { EntitiesResult } from "./step1-generate-entities";

const llm = new OpenAI({
  modelName: "gpt-4o",
  temperature: 0.7,
});

export interface TransitionsResult {
  transitions: z.infer<typeof TransitionSchema>[];
}

export async function generateTransitions(
  entitiesResult: EntitiesResult
): Promise<TransitionsResult> {
  console.log("\n=== STEP 2: Generating Rough Transitions ===");

  try {
    const transitionParser = StructuredOutputParser.fromZodSchema(
      z.object({
        transitions: z.array(TransitionSchema),
      })
    );

    const transitionPrompt = PromptTemplate.fromTemplate(`
Based on these entities from a shopping trip system:
{entities}

Generate transitions that describe how the system changes. Think about actions like:
- Adding money to wallet
- Adding items to shopping cart
- Making purchases
- Removing items from inventory
- Creating new entities

For each transition:
- Describe the effect (how properties change)
- Describe the constraints (what must be true for this transition to happen)

{format_instructions}
`);

    const transitionChain = transitionPrompt.pipe(llm).pipe(transitionParser);

    const transitionsResult = await transitionChain.invoke({
      entities: JSON.stringify(entitiesResult.entities, null, 2),
      format_instructions: transitionParser.getFormatInstructions(),
    });

    console.log("Generated Transitions:");
    console.log(JSON.stringify(transitionsResult, null, 2));

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
