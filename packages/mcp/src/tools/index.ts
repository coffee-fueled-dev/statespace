import { SystemSchema, makeExecutableSchema } from "@statespace/core";
import { FastMCP } from "fastmcp";
import { z } from "zod";

console.log(SystemSchema.shape);

export const registerDefineSystem = (server: FastMCP) =>
  server.addTool({
    name: "define_system",
    description:
      "Model a stateful system as a schema which describes its allowed shape and behavior. " +
      "Use this system to make decisions about optimal workflows given initial conditions and desired outcomes.",
    parameters: z.object({
      schema: z
        .string()
        .describe(
          "A JSON schema that defines the shape and behavior of the system."
        ),
    }),
    execute: async (args) => {
      const system = SystemSchema.parse(args.schema);
      console.log(JSON.stringify(system, null, 2));
      return JSON.stringify(args);
    },
  });
