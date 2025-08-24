import type { System } from "../shared/types";

/**
 * Defines the state changes caused by a transition. It returns the complete
 * next state that will be validated and applied.
 */
export type EffectFn<TSystem extends System> = (
  systemState: TSystem
) => TSystem;
