import type {
  Arrow,
  CompositionCertificate,
  MorphismDef,
  MorphismError,
  ObjectValue,
  SemanticObject,
} from "./domain";
import { classify, classifyAs, objectByKey } from "./objects";
import { err, flatMap, ok, type Result } from "./result";

/** Preserve literal morphism name unions from a const definition list. */
export function defineMorphisms<TState extends object, TContext = unknown>() {
  return <
    const TDefs extends readonly MorphismDef<
      TState,
      TContext,
      string,
      string,
      // biome-ignore lint/suspicious/noExplicitAny: open params slot for parameterized defs
      any
    >[],
  >(
    definitions: TDefs,
  ): TDefs => definitions;
}

/**
 * Seal a morphism definition with fixed params into a certified Arrow.
 * Source membership and target closure are enforced on every run.
 */
export function instantiate<TState extends object, TContext, S extends string, T extends string, P>(
  def: MorphismDef<TState, TContext, S, T, P>,
  params: P,
  objects: readonly SemanticObject<TState>[],
  /** Override transition name when params distinguish instances. */
  instanceName?: string,
): Arrow<TState, S, T, P> {
  if (!objectByKey(objects, def.source)) {
    throw new Error(`Unknown source object: ${def.source}`);
  }
  if (!objectByKey(objects, def.target)) {
    throw new Error(`Unknown target object: ${def.target}`);
  }

  const name = instanceName ?? def.name;

  return {
    name,
    source: def.source,
    target: def.target,
    params,
    run: (value, context) => {
      if (value.object !== def.source) {
        return err({
          type: "wrong-source",
          expected: def.source,
          actual: value.object,
        });
      }
      // Re-check live containment in case the witness is stale.
      const sourceCheck = classifyAs(value.state, objects, def.source);
      if (!sourceCheck.ok) return sourceCheck;

      let nextState: TState;
      try {
        const effectResult = def.run(sourceCheck.value, context as TContext, params);
        if (!effectResult.ok) return effectResult;
        nextState = effectResult.value;
      } catch (cause) {
        return err({
          type: "effect-failed",
          cause: cause instanceof Error ? cause.message : String(cause),
        });
      }

      const targetCheck = classify(nextState, objects);
      if (!targetCheck.ok) {
        return err({
          type: "invalid-target",
          expected: def.target,
        });
      }
      if (targetCheck.value.object !== def.target) {
        return err({
          type: "invalid-target",
          expected: def.target,
          actual: targetCheck.value.object,
        });
      }
      return ok({ object: def.target, state: nextState });
    },
  };
}

/** Identity endomorphism for an object key. */
export function identityArrow<TState extends object, K extends string>(
  objectKey: K,
): Arrow<TState, K, K> {
  return {
    name: `id_${objectKey}`,
    source: objectKey,
    target: objectKey,
    run: (value) => {
      if (value.object !== objectKey) {
        return err({
          type: "wrong-source",
          expected: objectKey,
          actual: value.object,
        });
      }
      return ok({ object: objectKey, state: value.state });
    },
  };
}

/**
 * Compose arrows left-to-right (f then g). Compatible pairs always compose;
 * connectivity failures yield a failed certificate and a failing apply.
 */
export function composeArrows<TState extends object>(
  arrows: readonly Arrow<TState>[],
): {
  certificate: CompositionCertificate;
  arrow: Arrow<TState>;
} {
  if (arrows.length === 0) {
    const error = "Empty composition.";
    return {
      certificate: { ok: false, intermediates: [], steps: [], error },
      arrow: {
        name: "(empty)",
        source: "",
        target: "",
        run: () => err({ type: "compose", reason: error }),
      },
    };
  }

  for (let i = 0; i < arrows.length - 1; i++) {
    const left = arrows[i];
    const right = arrows[i + 1];
    if (!left || !right) continue;
    if (left.target !== right.source) {
      const reason = `Cannot compose ${left.name} → ${right.name}: ${left.target} ≠ ${right.source}`;
      return {
        certificate: {
          ok: false,
          source: arrows[0]?.source,
          intermediates: [],
          steps: arrows.map((a) => a.name),
          error: reason,
        },
        arrow: {
          name: `(invalid:${left.name}∘${right.name})`,
          source: arrows[0]?.source ?? "",
          target: arrows[arrows.length - 1]?.target ?? "",
          run: () => err({ type: "compose", reason }),
        },
      };
    }
  }

  const first = arrows[0];
  const last = arrows[arrows.length - 1];
  if (!first || !last) {
    const error = "Empty composition.";
    return {
      certificate: { ok: false, intermediates: [], steps: [], error },
      arrow: {
        name: "(empty)",
        source: "",
        target: "",
        run: () => err({ type: "compose", reason: error }),
      },
    };
  }

  const intermediates = arrows.slice(0, -1).map((a) => a.target);
  const certificate: CompositionCertificate = {
    ok: true,
    source: first.source,
    target: last.target,
    intermediates,
    steps: arrows.map((a) => a.name),
  };

  const arrow: Arrow<TState> = {
    name: arrows.map((a) => a.name).join("∘"),
    source: first.source,
    target: last.target,
    run: (value, context) => {
      let current: Result<ObjectValue<TState, string>, MorphismError> = ok(value);
      for (const step of arrows) {
        current = flatMap(current, (v) => step.run(v, context));
        if (!current.ok) return current;
      }
      return current;
    },
  };

  return { certificate, arrow };
}

/** Binary compose: f then g (requires f.target === g.source). */
export function compose<
  TState extends object,
  A extends string,
  B extends string,
  C extends string,
>(f: Arrow<TState, A, B>, g: Arrow<TState, B, C>): Arrow<TState, A, C> {
  const { certificate, arrow } = composeArrows([f, g]);
  if (!certificate.ok) {
    return {
      name: `${f.name}∘${g.name}`,
      source: f.source,
      target: g.target,
      run: () =>
        err({
          type: "compose",
          reason: certificate.error ?? "Cannot compose",
        }),
    };
  }
  return {
    name: arrow.name,
    source: f.source,
    target: g.target,
    run: arrow.run,
  };
}
