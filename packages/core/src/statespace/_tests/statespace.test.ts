import { describe, test, expect } from "bun:test";
import type { Transition } from "../../transition/domain";
import { StateSpaceRepository } from "../adapters";
import type { Schema, StateSpace } from "../domain";

// Define a sample state type and schema
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

// Define a sample transition
const myTransition: Transition<MyState> = {
  name: "Increment a",
  effect: {
    path: "a",
    operation: "add",
    value: 1,
  },
  constraints: [],
};

// Define a sample state space
const myStateSpace: StateSpace<MyState> = {
  shape: myStateSchema,
  transitions: [myTransition],
};

describe("StateSpaceRepository", () => {
  describe("makeExecutable", () => {
    test("should create an executable state space", () => {
      const executableStateSpace =
        StateSpaceRepository.makeExecutable(myStateSpace);

      // Check shape
      expect(executableStateSpace.shape).toEqual(myStateSchema);

      // Check transitions
      expect(executableStateSpace.transitions).toHaveLength(1);
      expect(typeof executableStateSpace.transitions[0]).toBe("function");
    });

    test("the executable transition should work correctly", () => {
      const executableStateSpace =
        StateSpaceRepository.makeExecutable(myStateSpace);
      const executableTransition = executableStateSpace.transitions[0];

      const initialState: MyState = { a: 10, b: "test" };
      const result = executableTransition(initialState);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.a).toBe(11);
      }
    });

    test("the executable transition should fail if the new state violates the shape schema", () => {
      // New schema with a minimum constraint on 'a'
      const myStateSchemaWithMin: Schema<MyState> = {
        type: "object",
        properties: {
          a: { type: "number", minimum: 5 }, // 'a' must be >= 5
          b: { type: "string" },
        },
        required: ["a", "b"],
        additionalProperties: false,
      };

      // This transition will change 'a' to a value that is a valid number type,
      // but violates the schema constraint.
      const badTransition: Transition<MyState> = {
        name: "Bad Set",
        effect: {
          path: "a",
          operation: "set",
          value: 1, // This will pass validateMutation but fail the schema
        },
        constraints: [],
      };

      const stateSpaceWithBadTransition: StateSpace<MyState> = {
        shape: myStateSchemaWithMin,
        transitions: [badTransition],
      };

      const executableStateSpace = StateSpaceRepository.makeExecutable(
        stateSpaceWithBadTransition,
      );
      const executableTransition = executableStateSpace.transitions[0];

      const initialState: MyState = { a: 10, b: "test" };
      const result = executableTransition(initialState);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Malformed state after effect");
      }
    });
  });
});
