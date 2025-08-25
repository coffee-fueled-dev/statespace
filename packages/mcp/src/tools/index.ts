import {
  compileStatespaceSystem,
  StatespaceSystemDefinitionSchema,
} from "@statespace/core";
import { FastMCP } from "fastmcp";

export const registerDefineSystem = (server: FastMCP) =>
  server.addTool({
    name: "define_system",
    description:
      "Model a stateful system as a schema which describes its allowed shape and behavior. " +
      "Use this system to make decisions about optimal workflows given initial conditions and desired outcomes.",
    parameters: StatespaceSystemDefinitionSchema,
    execute: async (args) => {
      console.log(JSON.stringify(args, null, 2));
      // const system = compileStatespaceSystem(args);
      // console.log(JSON.stringify(system, null, 2));
      return JSON.stringify(args);
    },
  });
