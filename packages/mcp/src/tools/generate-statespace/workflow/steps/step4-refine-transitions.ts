import { OpenAI } from "@langchain/openai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { EffectSchema } from "../../schemas/refined/effect.zod";
import { ConstraintSchema } from "../../schemas/refined/constraint.zod";
import { z } from "zod";
import { TransitionsResult } from "./step2-generate-transitions";
import { JsonSchemaResult } from "./step3-refine-schema";

const llm = new OpenAI({
  modelName: "gpt-4o",
  temperature: 0.1,
});

export interface RefinedTransition {
  effect: z.infer<typeof EffectSchema>;
  constraint: z.infer<typeof ConstraintSchema>;
}

export interface RefinedTransitionsResult {
  transitions: RefinedTransition[];
}

export async function refineTransitions(
  transitionsResult: TransitionsResult,
  jsonSchemaResult: JsonSchemaResult
): Promise<RefinedTransitionsResult> {
  console.log("\n=== STEP 4: Refining Transitions to Structured Format ===");

  try {
    const refinedTransitionSchema = z.object({
      transitions: z.array(
        z.object({
          effect: EffectSchema,
          constraint: ConstraintSchema,
        })
      ),
    });

    const refinedTransitionParser = StructuredOutputParser.fromZodSchema(
      refinedTransitionSchema
    );

    const refineTransitionPrompt = PromptTemplate.fromTemplate(`
Convert these rough transition descriptions into structured Effects and Constraints format.

System JSON Schema:
{jsonSchema}

Rough Transitions:
{transitions}

For each transition, create:

1. An Effect object with:
   - name: descriptive name for the effect
   - path: dot notation path to the property being modified (e.g., "wallet.money", "cart.items")
   - operation: one of "set", "add", "subtract", "multiply", "divide", "concat", "prepend", "append", "cut"
   - value: the value to apply with the operation
   - cost: optional numeric cost for the operation

2. Constraint objects with:
   - phase: "before_transition" or "after_transition"
   - path: dot notation path to validate
   - validation: JSON Schema object that validates the constraint
   - message: optional error message

Make sure paths match the JSON Schema structure you created.

{format_instructions}
`);

    const refineTransitionChain = refineTransitionPrompt
      .pipe(llm)
      .pipe(refinedTransitionParser);

    const refinedTransitionsResult = await refineTransitionChain.invoke({
      jsonSchema: jsonSchemaResult.jsonSchema,
      transitions: JSON.stringify(transitionsResult.transitions, null, 2),
      format_instructions: refinedTransitionParser.getFormatInstructions(),
    });

    console.log("Refined Transitions:");
    console.log(JSON.stringify(refinedTransitionsResult, null, 2));

    return refinedTransitionsResult;
  } catch (error) {
    console.error("Error in step 4 - refining transitions:", error);
    throw new Error(
      `Failed to refine transitions: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
