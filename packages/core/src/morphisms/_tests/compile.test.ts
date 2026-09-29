import { describe, expect, test } from "bun:test";
import type { Schema } from "../../statespace/domain";
import { createMorphismSpace, instantiate, type MorphismDef, ok } from "../index";
import { defineObjects } from "../objects";

type Tip = { tip: "idle" | "ready" | "done"; value: number; steps: string[] };
type Ctx = { note?: string };

const shape = {
  type: "object",
  properties: {
    tip: { type: "string", enum: ["idle", "ready", "done"] },
    value: { type: "number" },
    steps: { type: "array", items: { type: "string" } },
  },
  required: ["tip", "value", "steps"],
  additionalProperties: false,
} as unknown as Schema<Tip>;

const objects = defineObjects<Tip>()([
  { key: "idle", contains: (s) => s.tip === "idle" },
  { key: "ready", contains: (s) => s.tip === "ready" },
  { key: "done", contains: (s) => s.tip === "done" },
]);

const armDef: MorphismDef<Tip, Ctx, "idle", "ready"> = {
  name: "arm",
  source: "idle",
  target: "ready",
  run: (v) => ok({ ...v.state, tip: "ready", steps: [...v.state.steps, "arm"] }),
};

const bumpDef: MorphismDef<Tip, Ctx, "ready", "ready", { delta: number }> = {
  name: "bump",
  source: "ready",
  target: "ready",
  run: (v, _ctx, params) => {
    if (params.delta <= 0) {
      return { ok: false, error: { type: "unavailable", reason: "Need positive delta." } };
    }
    return ok({
      ...v.state,
      value: v.state.value + params.delta,
      steps: [...v.state.steps, `bump:${params.delta}`],
    });
  },
};

const finishDef: MorphismDef<Tip, Ctx, "ready", "done"> = {
  name: "finish",
  source: "ready",
  target: "done",
  run: (v) => ok({ ...v.state, tip: "done", steps: [...v.state.steps, "finish"] }),
};

const arm = instantiate(armDef, undefined, objects);
const bump3 = instantiate(bumpDef, { delta: 3 }, objects, "bump:3");
const finish = instantiate(finishDef, undefined, objects);

const space = createMorphismSpace({
  shape,
  objects,
  morphisms: [arm, bump3, finish],
});

const idle: Tip = { tip: "idle", value: 0, steps: [] };

describe("createMorphismSpace", () => {
  test("guards reject illegal transitions", () => {
    const executable = space.makeExecutable();
    const bad = executable.apply(idle, "finish");
    expect(bad.success).toBe(false);
    expect(executable.enabled(idle).map((t) => t.name)).toEqual(["arm"]);
  });

  test("effects and parameterized availability", () => {
    const executable = space.makeExecutable();
    const armed = executable.apply(idle, "arm");
    expect(armed.success).toBe(true);
    if (!armed.success) return;
    expect(armed.state.tip).toBe("ready");

    const bumped = executable.apply(armed.state, "bump:3");
    expect(bumped.success).toBe(true);
    if (!bumped.success) return;
    expect(bumped.state.value).toBe(3);
    expect(bumped.state.steps).toContain("bump:3");
  });

  test("typed unavailable surfaces as transition error string", () => {
    const bump0 = instantiate(bumpDef, { delta: 0 }, objects, "bump:0");
    const gated = createMorphismSpace({
      shape,
      objects,
      morphisms: [arm, bump0],
    }).makeExecutable();
    const armed = gated.apply(idle, "arm");
    expect(armed.success).toBe(true);
    if (!armed.success) return;
    const rejected = gated.apply(armed.state, "bump:0");
    expect(rejected.success).toBe(false);
    if (rejected.success) return;
    expect(rejected.error).toBe("Need positive delta.");
  });

  test("schema rejection on invalid shape", () => {
    const executable = space.makeExecutable();
    const armed = executable.apply(idle, "arm");
    expect(armed.success).toBe(true);
    if (!armed.success) return;
    const corrupt = { ...armed.state, tip: "nope" as Tip["tip"] };
    const result = executable.apply(corrupt, "finish");
    expect(result.success).toBe(false);
  });

  test("arrowOf projects sealed arrows", () => {
    expect(space.arrowOf("arm")?.source).toBe("idle");
    expect(space.arrowOf("arm")?.target).toBe("ready");
    expect(space.arrowOf("bump:3")?.params).toEqual({ delta: 3 });
  });

  test("duplicate morphism names throw", () => {
    expect(() =>
      createMorphismSpace({
        shape,
        objects,
        morphisms: [arm, arm],
      }),
    ).toThrow(/Duplicate morphism name/);
  });

  test("duplicate object keys throw", () => {
    expect(() =>
      createMorphismSpace({
        shape,
        objects: [
          { key: "idle", contains: (s) => s.tip === "idle" },
          { key: "idle", contains: (s) => s.tip === "ready" },
        ],
        morphisms: [arm],
      }),
    ).toThrow(/Duplicate semantic object key/);
  });

  test("params are closed into the instance, not context", () => {
    const executable = space.makeExecutable();
    const armed = executable.apply(idle, "arm");
    expect(armed.success).toBe(true);
    if (!armed.success) return;
    // Context is free; delta already sealed in bump:3
    const bumped = executable.apply(armed.state, "bump:3", { note: "ignored-for-delta" });
    expect(bumped.success).toBe(true);
    if (!bumped.success) return;
    expect(bumped.state.value).toBe(3);
  });
});
