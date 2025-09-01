import { FastMCP } from "fastmcp";
import { z } from "zod";
import { generateStatespace } from "./workflow/workflow";

export const registerDefineSystem = (server: FastMCP) =>
  server.addTool({
    name: "define_system",
    description:
      "Model a stateful system as a schema which describes its allowed shape and behavior. " +
      "Use this system to make decisions about optimal workflows given initial conditions and desired outcomes.",
    parameters: z.object({
      systemDescription: z
        .string()
        .describe(
          "Give an overview of the entities in the system and how they relate to each other, and what should be considered when modeling them. " +
            "For each entity, describe its properties with their types. " +
            "Explain the goal you're trying to accomplish and any relevant context to undestand the nature of the system."
        ),
    }),
    execute: async (args) => {
      const statespace = await generateStatespace(args.systemDescription);
      console.log(JSON.stringify(statespace, null, 2));
      return JSON.stringify(statespace);
    },
  });
