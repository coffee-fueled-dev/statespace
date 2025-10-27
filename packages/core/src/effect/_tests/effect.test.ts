import { describe, test, expect } from "bun:test";
import { EffectRepository } from "../adapters";
import type { Effect, EffectFn } from "../domain";
import { mergeValue, validateMutation } from "../libs";
import type { Transition } from "../../transition";

type TestState = typeof testState;
const testState = {
  a: 10,
  b: "hello",
  c: {
    d: 5,
    e: "world",
  },
  f: 20,
  g: [100, 200, 300],
  h: [
    { id: 1, name: "first" },
    { id: 2, name: "second" },
  ],
};

describe("Effect libs", () => {
  describe("mergeValue", () => {
    test("should update a value at a root path", () => {
      const newState = mergeValue(testState, "a", 20);
      expect(newState.a).toBe(20);
      expect(newState).not.toBe(testState); // Should be a new object
    });

    test("should update a value at a nested path", () => {
      const newState = mergeValue(testState, "c.d", 15);
      expect(newState.c.d).toBe(15);
      expect(newState.c).not.toBe(testState.c);
    });

    test("should update a value at an array index", () => {
      const newState = mergeValue(testState, "g[1]", 999);
      expect(newState.g[1]).toBe(999);
      expect(newState.g).toEqual([100, 999, 300]);
      expect(newState.g).not.toBe(testState.g);
    });

    test("should update a nested value in an array element", () => {
      const newState = mergeValue(testState, "h[0].name", "updated");
      expect(newState.h[0].name).toBe("updated");
      expect(newState.h[0]).toEqual({ id: 1, name: "updated" });
      expect(newState.h).not.toBe(testState.h);
    });
  });

  describe("validateMutation", () => {
    test("should return the value if the type is compatible", () => {
      const nextValue = 20;
      const result = validateMutation("a", testState, nextValue);
      expect(result).toBe(nextValue);
    });

    test("should throw an error if the type is incompatible", () => {
      const nextValue = "not a number";
      expect(() => validateMutation("a", testState, nextValue as any)).toThrow(
        "Mutation of path 'a' resulted in incompatible type. Expected number, got string"
      );
    });
  });
});

describe("EffectRepository", () => {
  describe("resolveValue", () => {
    test("should return literal value", () => {
      const effect = {
        path: "a",
        operation: "set",
        value: 123,
      } satisfies Effect<TestState>;
      const value = EffectRepository.resolveValue(effect, testState);
      expect(value).toBe(123);
    });

    test("should resolve a path reference", () => {
      const effect = {
        path: "a",
        operation: "set",
        value: "$c.d",
      } satisfies Effect<TestState>;
      const value = EffectRepository.resolveValue(effect, testState);
      expect(value).toBe(5);
    });

    test("should resolve an array indexed path reference", () => {
      const effect = {
        path: "a",
        operation: "set",
        value: "$g[1]",
      } satisfies Effect<TestState>;
      const value = EffectRepository.resolveValue(effect, testState);
      expect(value).toBe(200);
    });

    test("should resolve a nested array path reference", () => {
      const effect = {
        path: "a",
        operation: "set",
        value: "$h[0].id",
      } satisfies Effect<TestState>;
      const value = EffectRepository.resolveValue(effect, testState);
      expect(value).toBe(1);
    });
  });

  describe("makeExecutable", () => {
    test("set operation should set a value", () => {
      const effect = {
        path: "a",
        operation: "set",
        value: 100,
      };
      const executable = EffectRepository.makeExecutable(effect);
      const result = executable("a", testState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.a).toBe(100);
      }
    });

    test("add operation should add to a number", () => {
      const effect = {
        path: "a",
        operation: "add",
        value: 5,
      } satisfies Effect<TestState>;
      const executable = EffectRepository.makeExecutable(effect);
      const result = executable("a", testState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.a).toBe(15);
      }
    });

    test("subtract operation", () => {
      const effect = {
        path: "a",
        operation: "subtract",
        value: 5,
      } satisfies Effect<TestState>;
      const executable = EffectRepository.makeExecutable(effect);
      const result = executable("a", testState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.a).toBe(5);
      }
    });

    test("multiply operation", () => {
      const effect = {
        path: "a",
        operation: "multiply",
        value: 2,
      } satisfies Effect<TestState>;
      const executable = EffectRepository.makeExecutable(effect);
      const result = executable("a", testState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.a).toBe(20);
      }
    });

    test("divide operation", () => {
      const effect = {
        path: "a",
        operation: "divide",
        value: 2,
      } satisfies Effect<TestState>;
      const executable = EffectRepository.makeExecutable(effect);
      const result = executable("a", testState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.a).toBe(5);
      }
    });

    test("append operation", () => {
      const effect = {
        path: "b",
        operation: "append",
        value: " world",
      } satisfies Effect<TestState>;
      const executable = EffectRepository.makeExecutable(effect);
      const result = executable("b", testState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.b).toBe("hello world");
      }
    });

    test("prepend operation", () => {
      const effect = {
        path: "b",
        operation: "prepend",
        value: "world ",
      } satisfies Effect<TestState>;
      const executable = EffectRepository.makeExecutable(effect);
      const result = executable("b", testState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.b).toBe("world hello");
      }
    });

    test("cut operation", () => {
      const effect = {
        path: "b",
        operation: "cut",
        value: "ell",
      } satisfies Effect<TestState>;
      const executable = EffectRepository.makeExecutable(effect);
      const result = executable("b", testState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.b).toBe("ho");
      }
    });

    test("transform operation", () => {
      const transformFn: EffectFn<typeof testState> = (_path, state) => ({
        success: true,
        state: { ...state, a: state.a + 1 },
        effect: null as any, // not needed for this test
      });
      const effect = {
        path: "a",
        operation: "transform",
        value: transformFn,
      } satisfies Effect<TestState>;
      const executable = EffectRepository.makeExecutable(effect);
      const result = executable("a", testState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.a).toBe(11);
      }
    });

    test("set operation should work with array indexing", () => {
      const effect = {
        path: "g[1]",
        operation: "set",
        value: 999,
      };
      const executable = EffectRepository.makeExecutable(effect);
      const result = executable("g[1]", testState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.g[1]).toBe(999);
        expect(result.state.g).toEqual([100, 999, 300]);
      }
    });

    test("add operation should work with array indexing", () => {
      const effect: Effect<TestState> = {
        path: "g[0]",
        operation: "add",
        value: 50,
      };
      const executable = EffectRepository.makeExecutable(effect);
      const result = executable("g[0]", testState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.g[0]).toBe(150);
      }
    });

    test("set operation should work with nested array paths", () => {
      const effect = {
        path: "h[0].name",
        operation: "set",
        value: "updated",
      } satisfies Effect<TestState>;
      const executable = EffectRepository.makeExecutable(effect);
      const result = executable("h[0].name", testState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.h[0].name).toBe("updated");
        expect(result.state.h[0].id).toBe(1); // should preserve other properties
      }
    });

    test("should throw on invalid operation", () => {
      const effect = {
        path: "a",
        operation: "invalid_op" as never,
        value: 1,
      } satisfies Effect<TestState>;
      const executable = EffectRepository.makeExecutable(effect);
      expect(() => executable("a", testState)).toThrow(
        "Invalid effect operation: invalid_op"
      );
    });
  });

  describe("apply", () => {
    const transition = {
      name: "test",
      effect: {
        path: "a",
        operation: "set",
        value: 100,
      },
      constraints: [],
    } satisfies Transition<typeof testState>;

    test("should apply effect and pass validation", () => {
      const validator = (state: typeof testState) => state.a === 100;
      const result = EffectRepository.apply(
        testState,
        "a",
        transition,
        validator
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.a).toBe(100);
      }
    });

    test("should return failure if validation fails", () => {
      const validator = (state: typeof testState) => state.a !== 100;
      const result = EffectRepository.apply(
        testState,
        "a",
        transition,
        validator
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Malformed state after effect");
      }
    });

    test("should return failure if effect application throws", () => {
      const badTransition = {
        name: "test",
        effect: {
          path: "a",
          operation: "set",
          value: "not a number" as never,
        },
        constraints: [],
      } satisfies Transition<typeof testState>;
      const validator = () => true;
      const result = EffectRepository.apply(
        testState,
        "a",
        badTransition,
        validator
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Failed to apply effect");
        expect(result.error).toContain("incompatible type");
      }
    });
  });
});
