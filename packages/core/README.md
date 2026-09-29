# @very-coffee/statespace

## Typing / registries

Prefer `StateSpace<T>` at machine definition sites. Use `AnyStateSpace` / `eraseStateSpace` (and the executable parallels) only when putting spaces into a mixed collection. Calling `apply` / `enabled` on an erased space means you are responsible for passing a state that matches the original `T`.

## Effects

Path-focused effects (`set`, numeric, string ops) keep a `path`. Whole-state transforms do not:

```ts
effect: {
  operation: "transform",
  transform: (state, context?) => ({ success: true, state: next }),
}
```

**Breaking:** the previous `{ path, operation: "transform", value: (path, state, context) => … }` shape is removed. Explorer edge metadata `path` is optional and omitted for transforms.

## Morphisms (optional)

Import from `@very-coffee/statespace/morphisms` (not the package root).

Semantic **objects** are named regions (`contains` predicates). **Arrows** are Kleisli morphisms: total functions into `Result` that carry certified `ObjectValue` witnesses. Availability and validation failures are typed `MorphismError`s. Category operations are total: compatible arrows always compose; identity laws hold via Result chaining.

```ts
import {
  classify,
  composeArrows,
  createMorphismSpace,
  defineMorphisms,
  defineObjects,
  identityArrow,
  instantiate,
  ok,
} from "@very-coffee/statespace/morphisms";

const objects = defineObjects<Tip>()([
  { key: "idle", contains: (s) => s.tip === "idle" },
  { key: "ready", contains: (s) => s.tip === "ready" },
]);

const armDef = {
  name: "arm",
  source: "idle" as const,
  target: "ready" as const,
  run: (v: { state: Tip }) => ok({ ...v.state, tip: "ready" as const }),
};

const arm = instantiate(armDef, undefined, objects);
const space = createMorphismSpace({
  shape,
  objects,
  morphisms: [arm],
});
```

- `instantiate(def, params, objects, instanceName?)` closes parameters into a concrete arrow (use `instanceName` when params distinguish transitions).
- `composeArrows([...])` returns a composition certificate plus a single arrow; left-to-right.
- `createMorphismSpace` compiles arrows to pathless `transform` transitions — no `effectPath`.
- Lifecycle/UI metadata (phase, labels, interpret) stays in consumer packages.
