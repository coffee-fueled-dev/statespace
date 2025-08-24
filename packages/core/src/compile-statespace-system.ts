import { compileConstraint } from "./constraints";
import { compileEffect } from "./effects";
import { type StatespaceSystemDefinition } from "./schema.zod";

export const compileStatespaceSystem = ({
  schema,
  transitionRules,
}: StatespaceSystemDefinition) => ({
  schema,
  transitionRules: transitionRules.map(compileTransitionRule),
});

const compileTransitionRule = ({
  constraints,
  effects,
  name,
}: StatespaceSystemDefinition["transitionRules"][number]) => ({
  name,
  constraint: compileConstraint({
    constraints,
  }),
  effect: compileEffect(effects),
});
