import type { System } from "../../schema.zod";
import type { Hash, TransitionSuccess } from "../../transitions";
import type { ExecutableSystem } from "../../compile";
import type { Shape } from "../../schema";
import { applyTransition } from "../../transitions/apply-transition";
import type { StudyConfig } from "../BFS/optimal-path";

export interface GenerateNeighborsEvent<TSystem extends System> {
  result: TransitionSuccess<Shape<TSystem["schema"]>>;
  isNewState: boolean;
}

export interface GenerateNeighborsConfig<TSystem extends System>
  extends StudyConfig<TSystem> {
  visitedStates?: Map<Hash, any>;
}

export type GenerateNeighborsHooks<TSystem extends System> = {
  onTransition?: (
    event: GenerateNeighborsEvent<TSystem>
  ) => Promise<void> | void;
  onCycleDetected?: (
    event: GenerateNeighborsEvent<TSystem>
  ) => Promise<void> | void;
  shouldContinue?: () => boolean;
};

/**
 * Generic state expansion utility that can be used by both breadth-first search
 * and optimal path algorithms. Processes transitions from a current state and
 * calls the provided callbacks for each transition result.
 */
export async function generateNeighbors<TSystem extends System>({
  system,
  initialState,
  codex,
  onTransition,
  onCycleDetected,
  visitedStates = new Map(),
  shouldContinue = () => true,
}: GenerateNeighborsConfig<TSystem> &
  GenerateNeighborsHooks<TSystem>): Promise<void> {
  if (!shouldContinue()) {
    return;
  }

  const neighbors = executeTransitions(system, initialState);

  for (const result of neighbors) {
    if (!shouldContinue()) {
      break;
    }

    const resultHash = await codex.encode(result.systemState.shape);
    const isNewState = !visitedStates.has(resultHash);

    // Detect cycle: if we're transitioning to an already visited state
    if (!isNewState && onCycleDetected) {
      await onCycleDetected({
        result,
        isNewState,
      });
    }

    // Call the transition callback
    if (onTransition) {
      await onTransition({
        result: {
          ...result,
          systemState: { ...result.systemState, hash: resultHash },
        },
        isNewState,
      });
    }
  }
}

/**
 * Generates all next states from the current state using the given transition rules.
 * @returns An array of transition outcomes (successful transitions only)
 */
export function executeTransitions<TSystem extends System>(
  system: ExecutableSystem<TSystem>,
  currentState: Shape<TSystem["schema"]>
): TransitionSuccess<Shape<TSystem["schema"]>>[] {
  const results: TransitionSuccess<Shape<TSystem["schema"]>>[] = [];

  for (const rule of system.transitionRules) {
    const outcome = applyTransition(
      system.schema,
      { shape: currentState },
      rule.name,
      rule
    );

    if (outcome.success) {
      results.push(outcome);
    }
  }

  return results;
}
