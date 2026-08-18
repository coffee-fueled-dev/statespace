import { describe, expect, test } from "bun:test";
import type { Transition } from "../../transition/domain";
import { StateSpaceRepository } from "../adapters";
import type { Schema, StateSpace } from "../domain";

interface MyState {
  a: number;
  b: string;
}

const myStateSchema: Schema<MyState> = {
  type: "object",
  properties: {
    a: { type: "number" },
    b: { type: "string" },
  },
  required: ["a", "b"],
  additionalProperties: false,
};

const incrementTransition: Transition<MyState> = {
  name: "Increment a",
  effect: {
    path: "a",
    operation: "add",
    value: 1,
  },
  constraints: [],
};

const quoteAccepted: Transition<MyState> = {
  name: "quote_accepted",
  effect: {
    path: "b",
    operation: "set",
    value: "accepted",
  },
  constraints: [
    {
      path: "b",
      phase: "before_transition",
      validation: { type: "string", const: "pending" },
    },
  ],
};

const failAfter: Transition<MyState> = {
  name: "fail_after",
  effect: {
    path: "a",
    operation: "set",
    value: 15,
  },
  constraints: [
    {
      path: "a",
      phase: "after_transition",
      validation: { type: "number", const: 99 },
    },
  ],
};

const myStateSpace: StateSpace<MyState> = {
  shape: myStateSchema,
  transitions: [incrementTransition],
};

describe("StateSpaceRepository", () => {
  describe("makeExecutable", () => {
    test("should keep named transition declarations", () => {
      const executableStateSpace = StateSpaceRepository.makeExecutable(myStateSpace);

      expect(executableStateSpace.shape).toEqual(myStateSchema);
      expect(executableStateSpace.transitions).toHaveLength(1);
      expect(executableStateSpace.transitions[0]).toEqual(incrementTransition);
    });

    test("should throw on duplicate transition names", () => {
      expect(() =>
        StateSpaceRepository.makeExecutable({
          shape: myStateSchema,
          transitions: [incrementTransition, { ...incrementTransition }],
        }),
      ).toThrow("Duplicate transition name: Increment a");
    });
  });

  describe("apply", () => {
    const space = StateSpaceRepository.makeExecutable({
      shape: myStateSchema,
      transitions: [incrementTransition, quoteAccepted, failAfter],
    });

    test("commits the named transition and returns name, effect, and next state", () => {
      const initialState: MyState = { a: 10, b: "pending" };
      const result = space.apply(initialState, "quote_accepted");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.name).toBe("quote_accepted");
        expect(result.effect).toEqual(quoteAccepted.effect);
        expect(result.state).toEqual({ a: 10, b: "accepted" });
        expect(result.state).not.toBe(initialState);
      }
      expect(initialState).toEqual({ a: 10, b: "pending" });
    });

    test("applies only the named transition when several are declared", () => {
      const result = space.apply({ a: 10, b: "test" }, "Increment a");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.name).toBe("Increment a");
        expect(result.state).toEqual({ a: 11, b: "test" });
      }
    });

    test("rejects an unknown name without committing", () => {
      const initialState: MyState = { a: 10, b: "test" };
      const result = space.apply(initialState, "missing");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Unknown transition: missing");
        expect(result.name).toBe("missing");
        expect(result.state).toBe(initialState);
        expect(result.effect).toBeUndefined();
      }
    });

    test("rejects a before-constraint failure without committing", () => {
      const initialState: MyState = { a: 10, b: "test" };
      const result = space.apply(initialState, "quote_accepted");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Constraints failed before transition");
        expect(result.state).toBe(initialState);
        expect(result.effect).toEqual(quoteAccepted.effect);
      }
      expect(initialState.b).toBe("test");
    });

    test("rejects an after-constraint failure and returns the pre-transition state", () => {
      const initialState: MyState = { a: 10, b: "test" };
      const result = space.apply(initialState, "fail_after");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Constraints failed after transition");
        expect(result.state).toBe(initialState);
        expect(result.state.a).toBe(10);
      }
    });

    test("rejects a shape violation without committing", () => {
      const myStateSchemaWithMin: Schema<MyState> = {
        type: "object",
        properties: {
          a: { type: "number", minimum: 5 },
          b: { type: "string" },
        },
        required: ["a", "b"],
        additionalProperties: false,
      };

      const badTransition: Transition<MyState> = {
        name: "Bad Set",
        effect: {
          path: "a",
          operation: "set",
          value: 1,
        },
        constraints: [],
      };

      const shapeSpace = StateSpaceRepository.makeExecutable({
        shape: myStateSchemaWithMin,
        transitions: [badTransition],
      });
      const initialState: MyState = { a: 10, b: "test" };
      const result = shapeSpace.apply(initialState, "Bad Set");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Malformed state after effect");
        expect(result.state).toBe(initialState);
      }
    });

    test("rejects an effect failure without committing", () => {
      const badTransition: Transition<MyState> = {
        name: "Bad Type",
        effect: {
          path: "a",
          operation: "set",
          value: "not a number" as never,
        },
        constraints: [],
      };
      const effectSpace = StateSpaceRepository.makeExecutable({
        shape: myStateSchema,
        transitions: [badTransition],
      });
      const initialState: MyState = { a: 10, b: "test" };
      const result = effectSpace.apply(initialState, "Bad Type");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("incompatible type");
        expect(result.state).toBe(initialState);
      }
    });

    test("passes context through to a transform effect", () => {
      const withContext: Transition<MyState> = {
        name: "set_from_context",
        effect: {
          path: "b",
          operation: "transform",
          value: (_path, state, context) => ({
            success: true,
            state: { ...state, b: String(context) },
          }),
        },
        constraints: [],
      };

      const contextSpace = StateSpaceRepository.makeExecutable({
        shape: myStateSchema,
        transitions: [withContext],
      });
      const result = contextSpace.apply({ a: 10, b: "test" }, "set_from_context", "quote-123");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.b).toBe("quote-123");
      }
    });

    test("applies without context when it is omitted", () => {
      const result = space.apply({ a: 10, b: "test" }, "Increment a");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.a).toBe(11);
      }
    });
  });

  describe("enabled", () => {
    test("should return only successful neighbors", () => {
      const space = StateSpaceRepository.makeExecutable({
        shape: myStateSchema,
        transitions: [incrementTransition, quoteAccepted, failAfter],
      });
      const initialState: MyState = { a: 10, b: "test" };
      const neighbors = space.enabled(initialState);

      expect(neighbors.map((n) => n.name)).toEqual(["Increment a"]);
      expect(neighbors[0]?.state.a).toBe(11);
    });

    test("should omit before-constraint and after-constraint failures", () => {
      const space = StateSpaceRepository.makeExecutable({
        shape: myStateSchema,
        transitions: [quoteAccepted, failAfter],
      });
      const neighbors = space.enabled({ a: 10, b: "test" });

      expect(neighbors).toHaveLength(0);
    });

    test("passes context through when listing enabled neighbors", () => {
      const gated: Transition<MyState> = {
        name: "set_from_context",
        effect: {
          path: "b",
          operation: "transform",
          value: (_path, state, context) => ({
            success: true,
            state: { ...state, b: String(context) },
          }),
        },
        constraints: [],
      };
      const space = StateSpaceRepository.makeExecutable({
        shape: myStateSchema,
        transitions: [gated],
      });
      const neighbors = space.enabled({ a: 10, b: "test" }, "quote-123");

      expect(neighbors).toHaveLength(1);
      expect(neighbors[0]?.state.b).toBe("quote-123");
    });
  });
});
