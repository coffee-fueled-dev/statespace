import { describe, test, expect, jest } from "bun:test";
import { ConstraintRepository } from "../adapters";
import type { Constraint, ConstraintFn } from "../domain";

const testState = {
  a: 10,
  b: "hello",
  c: {
    d: 5,
  },
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
});
