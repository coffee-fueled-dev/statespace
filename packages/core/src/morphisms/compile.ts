import type { EffectResult } from "../effect/domain";
import { StateSpaceRepository } from "../statespace/adapters";
import type { Schema, StateSpace } from "../statespace/domain";
import type { Transition } from "../transition/domain";
import type { Arrow, MorphismSpace, SemanticObject } from "./domain";
import { formatMorphismError } from "./domain";
import { classify } from "./objects";

function toTransition<TState extends object>(
  arrow: Arrow<TState>,
  objects: readonly SemanticObject<TState>[],
): Transition<TState> {
  return {
    name: arrow.name,
    constraints: [],
    effect: {
      operation: "transform",
      transform: (state, context) => {
        const classified = classify(state, objects);
        if (!classified.ok) {
          return {
            success: false,
            error: formatMorphismError(classified.error),
          } satisfies EffectResult<TState>;
        }
        const result = arrow.run(classified.value, context);
        if (!result.ok) {
          return {
            success: false,
            error: formatMorphismError(result.error),
          } satisfies EffectResult<TState>;
        }
        return { success: true, state: result.value.state };
      },
    },
  };
}

/**
 * Compile a finite set of instantiated arrows into a StateSpace plus morphism
 * helpers. No effectPath — transitions are whole-state transforms.
 */
export function createMorphismSpace<
  TState extends object,
  const TArrows extends readonly Arrow<TState>[],
>(options: {
  shape: Schema<TState>;
  objects: readonly SemanticObject<TState>[];
  /** Instantiated arrows; context type is whatever each arrow accepts. */
  morphisms: TArrows;
}): MorphismSpace<TState, TArrows> {
  const { shape, objects, morphisms } = options;

  const objectKeys = new Set(objects.map((o) => o.key));
  if (objectKeys.size !== objects.length) {
    throw new Error("Duplicate semantic object key.");
  }

  const seen = new Set<string>();
  for (const arrow of morphisms) {
    if (seen.has(arrow.name)) {
      throw new Error(`Duplicate morphism name: ${arrow.name}`);
    }
    seen.add(arrow.name);
    if (!objectKeys.has(arrow.source)) {
      throw new Error(`Unknown source object: ${arrow.source}`);
    }
    if (!objectKeys.has(arrow.target)) {
      throw new Error(`Unknown target object: ${arrow.target}`);
    }
  }

  const byName = new Map<string, TArrows[number]>(morphisms.map((a) => [a.name, a]));

  const stateSpace: StateSpace<TState> = {
    shape,
    transitions: morphisms.map((arrow) => toTransition(arrow, objects)),
  };

  let executable: ReturnType<typeof StateSpaceRepository.makeExecutable<TState>> | undefined;

  return {
    objects,
    morphisms,
    stateSpace,
    shape,
    arrowOf: (name) => byName.get(name),
    makeExecutable: () => {
      if (!executable) executable = StateSpaceRepository.makeExecutable(stateSpace);
      return executable;
    },
  };
}
