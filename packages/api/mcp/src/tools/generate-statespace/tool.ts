import { generateStatespace, generateStatespaceInputSchema } from "./index";

export const generateStatespaceViaTRPCTool = {
  name: "generate_statespace",
  description:
    "Use this tool to generate a statespace definition to model systems and workflows. " +
    "The statespace can be executed to identify optimal workflows with guaranteed logical consistency.",
  parameters: generateStatespaceInputSchema,
  execute: generateStatespace,
};
