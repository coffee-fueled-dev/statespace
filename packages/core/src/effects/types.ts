import type { Schema } from "../schema/schema.zod";
import type { Shape } from "../schema/types";

/**
 * Defines the state changes caused by a transition. It returns the complete
 * next state that will be validated and applied.
 */
export type EffectFn<TSchema extends Schema> = (
  systemState: Shape<TSchema>
) => Shape<TSchema>;
