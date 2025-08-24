import {
  compileStatespaceSystem,
  CostConstraintSchema,
  EffectSchema,
  PathConstraintSchema,
  StatespaceSystemDefinitionSchema,
} from "@statespace/core";
import { FastMCP } from "fastmcp";
import { z } from "zod/v4";

export const registerCreateTransitionRule = (server: FastMCP) =>
  server.addTool({
    name: "Create a transition rule",
    description: "Create a new transition rule",
    parameters: z.object({
      transitionRule: z.object({
        constraints: z
          .discriminatedUnion("type", [
            PathConstraintSchema.describe(
              "Path constraints limit the ability to transition based on the current or projected state of the system."
            ),
            CostConstraintSchema.describe(
              "Cost constraints limit the ability to transition based on the cost of the transition."
            ),
          ])
          .describe(
            "Define system constraints that will limit the state space by preventing transitions when the constraints are not met. " +
              "All constraints must be met for a transition to be allowed."
          ),
        effect: EffectSchema.describe(
          "Describe the proposed state of the system after the transition is applied. " +
            "You may define transforms that mutate the current state to produce some next state " +
            "or you may provide a completely new state. " +
            "If you define a definitive next state, that state will always be applied when the transition is applied."
        ),
      }),
    }),
    execute: async (args) => {
      return String(args.transitionRule);
    },
  });

export const registerDefineSystem = (server: FastMCP) =>
  server.addTool({
    name: "Define a system",
    description:
      "Model a stateful system as a schema which describes its allowed shape and transition rules that model its behavior. " +
      "Use this system to make decisions about optimal workflows given initial conditions and desired outcomes.",
    parameters: StatespaceSystemDefinitionSchema,
    execute: async (args) => {
      const system = compileStatespaceSystem(args);
      return JSON.stringify(system);
    },
  });
