import { describe, test, expect, jest } from "bun:test";
import { ConstraintRepository } from "../../constraint/adapters";
import type { Transition } from "../domain";
import { TransitionRepository } from "../adapters";
import type { Constraint } from "../../constraint";

const testState = {
  a: 10,
  b: 5,
  c: "hello",
};

describe("TransitionRepository", () => {
  describe("validateConstraints", () => {
    const constraints: Constraint<typeof testState>[] = [
      {
        path: "a",
        phase: "before_transition",
        validation: { type: "number", minimum: 5 },
      },
      {
        path: "a",
        phase: "after_transition",
        validation: { type: "number", maximum: 15 },
      },
    ];

    test("should return true if all constraints for the phase pass", () => {
      const result = TransitionRepository.validateConstraints(
        "before_transition",
        constraints,
        testState,
      );
      expect(result).toBe(true);
    });

    test("should return false if a constraint for the phase fails", () => {
      const failingConstraints: Constraint<typeof testState>[] = [
        ...constraints,
        {
          path: "b",
          phase: "before_transition",
          validation: { type: "number", minimum: 10 }, // b is 5, will fail
        },
      ];
      const result = TransitionRepository.validateConstraints(
        "before_transition",
        failingConstraints,
        testState,
      );
      expect(result).toBe(false);
    });

    test("should return true if there are no constraints for the phase", () => {
      const result = TransitionRepository.validateConstraints(
        "after_transition",
        [constraints[0]], // only a before_transition constraint
        testState,
      );
      expect(result).toBe(true);
    });

    test("should return false if applying a constraint throws an error", () => {
      const applySpy = jest
        .spyOn(ConstraintRepository, "apply")
        .mockImplementation(() => {
          throw new Error("Test Error");
        });

      const result = TransitionRepository.validateConstraints(
        "before_transition",
        constraints,
        testState,
      );
      expect(result).toBe(false);
      applySpy.mockRestore();
    });
  });

  describe("makeExecutable / apply", () => {
    const validator = () => true;

    test("should succeed if effect and all constraints pass", () => {
      const transition: Transition<typeof testState> = {
        name: "Success",
        effect: { path: "a", operation: "set", value: 15 },
        constraints: [
          {
            path: "a",
            phase: "before_transition",
            validation: { type: "number", const: 10 },
          },
          {
            path: "a",
            phase: "after_transition",
            validation: { type: "number", const: 15 },
          },
        ],
      };

      const result = TransitionRepository.apply(
        testState,
        transition,
        validator,
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.a).toBe(15);
      }
    });

    test("should fail if a before_transition constraint fails", () => {
      const transition: Transition<typeof testState> = {
        name: "Fail Before",
        effect: { path: "a", operation: "set", value: 15 },
        constraints: [
          {
            path: "a",
            phase: "before_transition",
            validation: { type: "number", const: 99 }, // will fail
          },
        ],
      };

      const result = TransitionRepository.apply(
        testState,
        transition,
        validator,
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Constraints failed before transition");
        expect(result.state.a).toBe(10); // state should be unchanged
      }
    });

    test("should fail if the effect fails", () => {
      const transition: Transition<typeof testState> = {
        name: "Fail Effect",
        effect: { path: "a", operation: "set", value: "not a number" } as any, // will fail
        constraints: [],
      };

      const result = TransitionRepository.apply(
        testState,
        transition,
        validator,
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("incompatible type");
      }
    });

    test("should fail if an after_transition constraint fails", () => {
      const transition: Transition<typeof testState> = {
        name: "Fail After",
        effect: { path: "a", operation: "set", value: 15 },
        constraints: [
          {
            path: "a",
            phase: "after_transition",
            validation: { type: "number", const: 99 }, // will fail on new state
          },
        ],
      };

      const result = TransitionRepository.apply(
        testState,
        transition,
        validator,
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Constraints failed after transition");
        expect(result.state.a).toBe(15); // state is the new, invalid state
      }
    });
  });
});
