import { describe, test, expect, jest } from "bun:test";
import { ConstraintRepository } from "../adapters";
import type { Constraint, ConstraintFn } from "../domain";

const testState = {
  a: 10,
  b: "hello",
  c: {
    d: 5,
  },
  e: [100, 200, 300],
  f: [
    { id: 1, name: "first", active: true },
    { id: 2, name: "second", active: false },
  ],
};

describe("ConstraintRepository", () => {
  describe("formatResult", () => {
    test("should return a success result when isValid is true", () => {
      const result = ConstraintRepository.formatResult({
        isValid: true,
        state: testState,
        phase: "before_transition",
        path: "a",
      });
      expect(result.success).toBe(true);
      expect(result).toEqual({
        success: true,
        state: testState,
        phase: "before_transition",
        path: "a",
      });
    });

    test("should return a failure result when isValid is false", () => {
      const result = ConstraintRepository.formatResult({
        isValid: false,
        state: testState,
        phase: "after_transition",
        path: "b",
        message: "Custom error",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.message).toBe("Custom error");
      }
    });

    test("should use a default error message for failure if none is provided", () => {
      const result = ConstraintRepository.formatResult({
        isValid: false,
        state: testState,
        phase: "after_transition",
        path: "b",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.message).toBe("Constraint validation failed");
      }
    });
  });

  describe("createImperative", () => {
    test("should create a constraint function that succeeds", () => {
      const imperativeFn = (value: number) => ({ success: value > 5 });
      const constraintFn = ConstraintRepository.createImperative<
        typeof testState,
        "a"
      >(imperativeFn);
      const result = constraintFn("a", testState, "before_transition");
      expect(result.success).toBe(true);
    });

    test("should create a constraint function that fails", () => {
      const imperativeFn = (value: number, state: typeof testState) => ({
        success: value > state.c.d * 3,
        message: "Value not high enough",
      });
      const constraintFn = ConstraintRepository.createImperative<
        typeof testState,
        "a"
      >(imperativeFn);
      const result = constraintFn("a", testState, "before_transition");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.message).toBe("Value not high enough");
      }
    });
  });

  describe("makeExecutable", () => {
    test("should execute the validation function when it's a function", () => {
      const myConstraintFn = jest.fn((path, state, phase) => ({
        success: true,
        path,
        state,
        phase,
      }));

      const constraint: Constraint<typeof testState> = {
        path: "a",
        phase: "before_transition",
        validation: myConstraintFn,
      };
      const executable = ConstraintRepository.makeExecutable(constraint);
      executable("a", testState, "before_transition");

      expect(myConstraintFn).toHaveBeenCalledTimes(1);
      expect(myConstraintFn).toHaveBeenCalledWith(
        "a",
        testState,
        "before_transition"
      );
    });

    test("should create an executable from a schema that succeeds", () => {
      const constraint: Constraint<typeof testState> = {
        path: "a",
        phase: "before_transition",
        validation: { type: "number", minimum: 5 },
      };
      const executable = ConstraintRepository.makeExecutable(constraint);
      const result = executable("a", testState, "before_transition");
      expect(result.success).toBe(true);
    });

    test("should create an executable from a schema that fails", () => {
      const constraint: Constraint<typeof testState> = {
        path: "a",
        phase: "before_transition",
        validation: { type: "number", maximum: 5 },
      };
      const executable = ConstraintRepository.makeExecutable(constraint);
      const result = executable("a", testState, "before_transition");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.message).toContain("must be <= 5");
      }
    });
  });

  describe("apply", () => {
    test("should apply a schema constraint that succeeds", () => {
      const constraint: Constraint<typeof testState> = {
        path: "b",
        phase: "after_transition",
        validation: { type: "string", minLength: 3 },
      };
      const result = ConstraintRepository.apply(
        constraint,
        testState,
        "b",
        "after_transition"
      );
      expect(result.success).toBe(true);
    });

    test("should apply a schema constraint that fails", () => {
      const constraint: Constraint<typeof testState> = {
        path: "b",
        phase: "after_transition",
        validation: { type: "string", maxLength: 3 },
      };
      const result = ConstraintRepository.apply(
        constraint,
        testState,
        "b",
        "after_transition"
      );
      expect(result.success).toBe(false);
    });

    test("should apply a function constraint", () => {
      const constraint: Constraint<typeof testState> = {
        path: "c.d",
        phase: "before_transition",
        validation: (path, state, phase) => ({
          success: state.c.d > 0,
          path,
          state,
          phase,
        }),
      };
      const result = ConstraintRepository.apply(
        constraint,
        testState,
        "c.d",
        "before_transition"
      );
      expect(result.success).toBe(true);
    });
  });

  describe("Array indexing support", () => {
    test("should apply schema constraint to array element", () => {
      const constraint: Constraint<typeof testState> = {
        path: "e[0]",
        phase: "before_transition",
        validation: { type: "number", minimum: 50 },
      };
      const result = ConstraintRepository.apply(
        constraint,
        testState,
        "e[0]",
        "before_transition"
      );
      expect(result.success).toBe(true);
    });

    test("should fail schema constraint on array element", () => {
      const constraint: Constraint<typeof testState> = {
        path: "e[1]",
        phase: "before_transition",
        validation: { type: "number", maximum: 150 },
      };
      const result = ConstraintRepository.apply(
        constraint,
        testState,
        "e[1]",
        "before_transition"
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.message).toContain("must be <= 150");
      }
    });

    test("should apply schema constraint to nested array object property", () => {
      const constraint: Constraint<typeof testState> = {
        path: "f[0].id",
        phase: "after_transition",
        validation: { type: "number", minimum: 1 },
      };
      const result = ConstraintRepository.apply(
        constraint,
        testState,
        "f[0].id",
        "after_transition"
      );
      expect(result.success).toBe(true);
    });

    test("should apply function constraint to array element", () => {
      const constraint: Constraint<typeof testState> = {
        path: "e[2]",
        phase: "before_transition",
        validation: (path, state, phase) => ({
          success: state.e[2] > 250,
          path,
          state,
          phase,
          message: "Third element must be greater than 250",
        }),
      };
      const result = ConstraintRepository.apply(
        constraint,
        testState,
        "e[2]",
        "before_transition"
      );
      expect(result.success).toBe(true);
    });

    test("should fail function constraint on array element", () => {
      const constraint: Constraint<typeof testState> = {
        path: "e[0]",
        phase: "before_transition",
        validation: (path, state, phase) => ({
          success: state.e[0] > 150,
          path,
          state,
          phase,
          message: "First element must be greater than 150",
        }),
      };
      const result = ConstraintRepository.apply(
        constraint,
        testState,
        "e[0]",
        "before_transition"
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.message).toBe("First element must be greater than 150");
      }
    });

    test("should apply constraint to nested object in array", () => {
      const constraint: Constraint<typeof testState> = {
        path: "f[1].name",
        phase: "after_transition",
        validation: { type: "string", minLength: 3 },
      };
      const result = ConstraintRepository.apply(
        constraint,
        testState,
        "f[1].name",
        "after_transition"
      );
      expect(result.success).toBe(true);
    });

    test("should use createImperative with array indexed paths", () => {
      const imperativeFn = (value: number, state: typeof testState) => ({
        success: value < state.e[1], // e[0] should be less than e[1]
        message: "First element should be less than second",
      });
      const constraintFn = ConstraintRepository.createImperative<
        typeof testState,
        "e[0]"
      >(imperativeFn);
      const result = constraintFn("e[0]", testState, "before_transition");
      expect(result.success).toBe(true);
    });

    test("should fail createImperative with array indexed paths", () => {
      const imperativeFn = (value: number, state: typeof testState) => ({
        success: value > state.e[2], // e[1] should be greater than e[2]
        message: "Second element should be greater than third",
      });
      const constraintFn = ConstraintRepository.createImperative<
        typeof testState,
        "e[1]"
      >(imperativeFn);
      const result = constraintFn("e[1]", testState, "before_transition");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.message).toBe(
          "Second element should be greater than third"
        );
      }
    });

    test("should validate boolean property in array object", () => {
      const constraint: Constraint<typeof testState> = {
        path: "f[0].active",
        phase: "before_transition",
        validation: { type: "boolean" },
      };
      const result = ConstraintRepository.apply(
        constraint,
        testState,
        "f[0].active",
        "before_transition"
      );
      expect(result.success).toBe(true);
    });
  });
});
