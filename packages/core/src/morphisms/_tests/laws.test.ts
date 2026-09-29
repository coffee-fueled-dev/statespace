import { describe, expect, test } from "bun:test";
import {
  type Arrow,
  compose,
  composeArrows,
  identityArrow,
  instantiate,
  type MorphismDef,
  type ObjectValue,
} from "../index";
import { classify, defineObjects } from "../objects";
import { ok } from "../result";

type Tip = { tip: "idle" | "ready" | "done"; value: number; steps: string[] };

const objects = defineObjects<Tip>()([
  { key: "idle", contains: (s) => s.tip === "idle" },
  { key: "ready", contains: (s) => s.tip === "ready" },
  { key: "done", contains: (s) => s.tip === "done" },
]);

const armDef: MorphismDef<Tip, unknown, "idle", "ready"> = {
  name: "arm",
  source: "idle",
  target: "ready",
  run: (v) => ok({ ...v.state, tip: "ready", steps: [...v.state.steps, "arm"] }),
};

const bumpDef: MorphismDef<Tip, unknown, "ready", "ready"> = {
  name: "bump",
  source: "ready",
  target: "ready",
  run: (v) => ok({ ...v.state, value: v.state.value + 1, steps: [...v.state.steps, "bump"] }),
};

const finishDef: MorphismDef<Tip, unknown, "ready", "done"> = {
  name: "finish",
  source: "ready",
  target: "done",
  run: (v) => ok({ ...v.state, tip: "done", steps: [...v.state.steps, "finish"] }),
};

const rejectDef: MorphismDef<Tip, unknown, "ready", "ready"> = {
  name: "reject",
  source: "ready",
  target: "ready",
  run: () => ({ ok: false, error: { type: "unavailable", reason: "blocked" } }),
};

const arm = instantiate(armDef, undefined, objects);
const bump = instantiate(bumpDef, undefined, objects);
const finish = instantiate(finishDef, undefined, objects);
const reject = instantiate(rejectDef, undefined, objects);

const idle: Tip = { tip: "idle", value: 0, steps: [] };

function witness(state: Tip): ObjectValue<Tip, string> {
  const result = classify(state, objects);
  if (!result.ok) throw new Error("expected classification");
  return result.value;
}

describe("classification", () => {
  test("classifies uniquely", () => {
    expect(classify(idle, objects)).toEqual({
      ok: true,
      value: { object: "idle", state: idle },
    });
  });

  test("ambiguous contains returns ambiguous", () => {
    const overlapping = defineObjects<Tip>()([
      { key: "a", contains: () => true },
      { key: "b", contains: () => true },
    ]);
    const result = classify(idle, overlapping);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe("ambiguous");
  });

  test("no match returns unclassified", () => {
    const empty = defineObjects<Tip>()([]);
    const result = classify(idle, empty);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe("unclassified");
  });
});

describe("source and target closure", () => {
  test("rejects wrong source region", () => {
    const ready = { tip: "ready" as const, value: 0, steps: [] };
    const result = arm.run(witness(ready) as ObjectValue<Tip, "idle">, undefined);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe("wrong-source");
  });

  test("rejects target closure failure", () => {
    const bad: MorphismDef<Tip, unknown, "idle", "ready"> = {
      name: "bad",
      source: "idle",
      target: "ready",
      run: (v) => ok({ ...v.state, tip: "done" }),
    };
    const arrow = instantiate(bad, undefined, objects);
    const result = arrow.run(witness(idle) as ObjectValue<Tip, "idle">, undefined);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe("invalid-target");
  });

  test("succeeds with membership and closure", () => {
    const result = arm.run(witness(idle) as ObjectValue<Tip, "idle">, undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.object).toBe("ready");
    expect(result.value.state.tip).toBe("ready");
  });
});

describe("identity and composition laws", () => {
  test("identity is a no-op endomorphism", () => {
    const id = identityArrow<Tip, "idle">("idle");
    const result = id.run(witness(idle) as ObjectValue<Tip, "idle">, undefined);
    expect(result).toEqual({ ok: true, value: { object: "idle", state: idle } });
  });

  test("compose rejects source/target mismatch", () => {
    const bad = composeArrows([finish, arm]);
    expect(bad.certificate.ok).toBe(false);
    expect(bad.certificate.error).toMatch(/Cannot compose/);
    const result = bad.arrow.run(witness(idle), undefined);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe("compose");
  });

  test("left and right identity: id ∘ f = f = f ∘ id", () => {
    const idIdle = identityArrow<Tip, "idle">("idle");
    const idReady = identityArrow<Tip, "ready">("ready");
    const left = compose(idIdle, arm);
    const right = compose(arm, idReady);
    const w = witness(idle) as ObjectValue<Tip, "idle">;
    expect(left.run(w, undefined)).toEqual(arm.run(w, undefined));
    expect(right.run(w, undefined)).toEqual(arm.run(w, undefined));
  });

  test("associativity on success path", () => {
    const left = composeArrows([compose(arm, bump), finish]);
    const right = composeArrows([arm, compose(bump, finish)]);
    const flat = composeArrows([arm, bump, finish]);
    expect(flat.certificate.ok).toBe(true);
    expect(flat.certificate.steps).toEqual(["arm", "bump", "finish"]);
    const w = witness(idle);
    const composed = flat.arrow.run(w, undefined);
    expect(composed.ok).toBe(true);
    expect(left.arrow.run(w, undefined)).toEqual(composed);
    expect(right.arrow.run(w, undefined)).toEqual(composed);
    if (!composed.ok) return;
    expect(composed.value.state.tip).toBe("done");
    expect(composed.value.state.steps).toEqual(["arm", "bump", "finish"]);
    expect(composed.value.state.value).toBe(1);
  });

  test("associativity preserves first failure", () => {
    const left = composeArrows([compose(arm, reject), finish]);
    const right = composeArrows([arm, compose(reject, finish)]);
    const flat = composeArrows([arm, reject, finish]);
    const w = witness(idle);
    const a = left.arrow.run(w, undefined);
    const b = right.arrow.run(w, undefined);
    const c = flat.arrow.run(w, undefined);
    expect(a).toEqual(b);
    expect(b).toEqual(c);
    expect(a.ok).toBe(false);
    if (a.ok) return;
    expect(a.error).toEqual({ type: "unavailable", reason: "blocked" });
  });

  test("determinism for fixed state and context", () => {
    const path = composeArrows([arm, bump, finish]).arrow;
    const w = witness(idle);
    expect(path.run(w, undefined)).toEqual(path.run(w, undefined));
  });
});

describe("combinatorial path generation", () => {
  const primitives: Arrow<Tip>[] = [arm, bump, finish];

  function* pathsOfLength(n: number): Generator<Arrow<Tip>[]> {
    if (n === 0) {
      yield [];
      return;
    }
    for (const head of primitives) {
      for (const rest of pathsOfLength(n - 1)) {
        yield [head, ...rest];
      }
    }
  }

  test("every compatible path of length ≤ 3 associates and matches sequential run", () => {
    for (let n = 1; n <= 3; n++) {
      for (const steps of pathsOfLength(n)) {
        const { certificate, arrow } = composeArrows(steps);
        if (!certificate.ok) {
          // incompatible — apply must fail with compose error from any witness
          const result = arrow.run(witness(idle), undefined);
          expect(result.ok).toBe(false);
          continue;
        }

        // Sequential apply from idle when the path starts at idle
        if (certificate.source !== "idle") continue;

        let sequential: Tip | null = idle;
        for (const step of steps) {
          const classified = classify(sequential, objects);
          if (!classified.ok) {
            sequential = null;
            break;
          }
          const next = step.run(classified.value, undefined);
          if (!next.ok) {
            sequential = null;
            break;
          }
          sequential = next.value.state;
        }

        const composed = arrow.run(witness(idle), undefined);
        if (sequential === null) {
          expect(composed.ok).toBe(false);
        } else {
          expect(composed.ok).toBe(true);
          if (!composed.ok) return;
          expect(composed.value.state).toEqual(sequential);
        }

        if (n >= 2) {
          const mid = Math.floor(n / 2);
          const left = composeArrows([
            composeArrows(steps.slice(0, mid)).arrow,
            ...steps.slice(mid),
          ]);
          const right = composeArrows([
            ...steps.slice(0, mid),
            composeArrows(steps.slice(mid)).arrow,
          ]);
          if (left.certificate.ok && right.certificate.ok) {
            expect(left.arrow.run(witness(idle), undefined)).toEqual(composed);
            expect(right.arrow.run(witness(idle), undefined)).toEqual(composed);
          }
        }
      }
    }
  });
});
