import { describe, test, expect } from "bun:test";
import { EffectRepository } from "../adapters";
import type { Effect, EffectFn } from "../domain";
import { mergeValue, validateMutation } from "../libs";
import type { Transition } from "../../transition";

const testState = {
  a: 10,
  b: "hello",
  c: {
    d: 5,
    e: "world",
  },
  f: 20,
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
        "Mutation of path 'a' resulted in incompatible type. Expected number, got string",
      );
    });
  });
});

describe("EffectRepository", () => {
  describe("resolveValue", () => {
    test("should return literal value", () => {
      const effect: Effect<typeof testState> = {
        path: "a",
        operation: "set",
        value: 123,
      };
      const value = EffectRepository.resolveValue(effect, testState);
      expect(value).toBe(123);
    });

    test("should resolve a path reference", () => {
      const effect: Effect<typeof testState> = {
        path: "a",
        operation: "set",
        value: "$c.d",
      };
      const value = EffectRepository.resolveValue(effect, testState);
      expect(value).toBe(5);
    });
  });

  describe("makeExecutable", () => {
    test("set operation should set a value", () => {
      const effect: Effect<typeof testState> = {
        path: "a",
        operation: "set",
        value: 100,
      };
      const executable =
        EffectRepository.makeExecutable<typeof testState>(effect);
      const result = executable("a", testState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.a).toBe(100);
      }
    });

    test("add operation should add to a number", () => {
      const effect: Effect<typeof testState> = {
        path: "a",
        operation: "add",
        value: 5,
      };
      const executable =
        EffectRepository.makeExecutable<typeof testState>(effect);
      const result = executable("a", testState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.a).toBe(15);
      }
    });

    test("subtract operation", () => {
      const effect: Effect<typeof testState> = {
        path: "a",
        operation: "subtract",
        value: 5,
      };
      const executable =
        EffectRepository.makeExecutable<typeof testState>(effect);
      const result = executable("a", testState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.a).toBe(5);
      }
    });

    test("multiply operation", () => {
      const effect: Effect<typeof testState> = {
        path: "a",
        operation: "multiply",
        value: 2,
      };
      const executable =
        EffectRepository.makeExecutable<typeof testState>(effect);
      const result = executable("a", testState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.a).toBe(20);
      }
    });

    test("divide operation", () => {
      const effect: Effect<typeof testState> = {
        path: "a",
        operation: "divide",
        value: 2,
      };
      const executable =
        EffectRepository.makeExecutable<typeof testState>(effect);
      const result = executable("a", testState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.a).toBe(5);
      }
    });

    test("append operation", () => {
      const effect: Effect<typeof testState> = {
        path: "b",
        operation: "append",
        value: " world",
      };
      const executable =
        EffectRepository.makeExecutable<typeof testState>(effect);
      const result = executable("b", testState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.b).toBe("hello world");
      }
    });

    test("prepend operation", () => {
      const effect: Effect<typeof testState> = {
        path: "b",
        operation: "prepend",
        value: "world ",
      };
      const executable =
        EffectRepository.makeExecutable<typeof testState>(effect);
      const result = executable("b", testState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.b).toBe("world hello");
      }
    });

    test("cut operation", () => {
      const effect: Effect<typeof testState> = {
        path: "b",
        operation: "cut",
        value: "ell",
      };
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
      const effect: Effect<typeof testState> = {
        path: "a",
        operation: "transform",
        value: transformFn,
      };
      const executable = EffectRepository.makeExecutable(effect);
      const result = executable("a", testState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.a).toBe(11);
      }
    });

    test("should throw on invalid operation", () => {
      const effect = { path: "a", operation: "invalid_op", value: 1 } as any;
      const executable =
        EffectRepository.makeExecutable<typeof testState>(effect);
      expect(() => executable("a", testState)).toThrow(
        "Invalid effect operation: invalid_op",
      );
    });
  });

  describe("apply", () => {
    const transition = {
      name: "test",
      effect: { path: "a", operation: "set", value: 100 },
      constraints: [],
    } satisfies Transition<typeof testState>;

    test("should apply effect and pass validation", () => {
      const validator = (state: typeof testState) => state.a === 100;
      const result = EffectRepository.apply(
        testState,
        "a",
        transition,
        validator,
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
        validator,
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Malformed state after effect");
      }
    });

    test("should return failure if effect application throws", () => {
      const badTransition = {
        name: "test",
        effect: { path: "a", operation: "set", value: "not a number" } as any,
        constraints: [],
      } satisfies Transition<typeof testState>;
      const validator = () => true;
      const result = EffectRepository.apply(
        testState,
        "a",
        badTransition,
        validator,
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Failed to apply effect");
        expect(result.error).toContain("incompatible type");
      }
    });
  });
});
