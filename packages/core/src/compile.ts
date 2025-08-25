import type { ValidateFunction } from "ajv";
import { type System } from "./schema.zod";
import { makeExecutableSchema } from "./schema/compile";
import type { Shape } from "./schema/types";
import {
  makeExecutableTransition,
  type ExecutableTransition,
} from "./transitions/compile";
import type { Schema } from "./schema";

export type ExecutableSystem<TSystem extends System<Schema>> = {
  schema: ValidateFunction<Shape<TSystem["schema"]>>;
  transitionRules: ExecutableTransition<TSystem["schema"]>[];
  rawShape: Partial<TSystem>;
};

export const makeExecutableSystem = <TSystem extends System<Schema>>({
  schema,
  transitionRules,
}: TSystem): ExecutableSystem<TSystem> => ({
  schema: makeExecutableSchema(schema),
  transitionRules: transitionRules.map(makeExecutableTransition),
  rawShape: { schema, transitionRules } as Partial<TSystem>,
});
