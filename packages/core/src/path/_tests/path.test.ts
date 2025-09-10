import { describe, test, expect } from "bun:test";
import { PathRepository } from "../adapters";
import type { Path } from "../domain";

const testState = {
  a: 1,
  b: {
    c: "hello",
    d: {
      e: true,
    },
  },
  f: [1, 2, 3],
  g: null,
};
type TestStatePath = Path<typeof testState>;

describe("PathRepository", () => {
  describe("paths", () => {
    test("should return all valid paths for a given object", () => {
      const expectedPaths: TestStatePath[] = [
        "a",
        "b",
        "b.c",
        "b.d",
        "b.d.e",
        "f",
        "g",
      ];
      const result = PathRepository.paths(testState);
      expect(result.sort()).toEqual(expectedPaths.sort());
    });

    test("should return an empty array for an empty object", () => {
      expect(PathRepository.paths({})).toEqual([]);
    });

    test("should handle objects with null values", () => {
      const stateWithNull = { a: 1, b: null };
      type StateWithNullPath = Path<typeof stateWithNull>;
      const expected: StateWithNullPath[] = ["a", "b"];
      expect(PathRepository.paths(stateWithNull).sort()).toEqual(
        expected.sort(),
      );
    });

    test("should not traverse into arrays", () => {
      const stateWithArray = { a: [{ b: 1 }] };
      const expected = ["a"];
      expect(PathRepository.paths(stateWithArray)).toEqual(expected);
    });
  });

  describe("isPath", () => {
    test("should return true for valid paths", () => {
      expect(PathRepository.isPath("a", testState)).toBe(true);
      expect(PathRepository.isPath("b.c", testState)).toBe(true);
      expect(PathRepository.isPath("b.d.e", testState)).toBe(true);
    });

    test("should return false for invalid paths", () => {
      expect(PathRepository.isPath("x", testState)).toBe(false);
      expect(PathRepository.isPath("a.x", testState)).toBe(false);
      expect(PathRepository.isPath("b.c.x", testState)).toBe(false);
    });

    test("should return false for '.' path", () => {
      expect(PathRepository.isPath(".", testState)).toBe(false);
    });
  });

  describe("isPathRef", () => {
    test("should return true for valid path references", () => {
      expect(PathRepository.isPathRef("$a", testState)).toBe(true);
      expect(PathRepository.isPathRef("$b.c", testState)).toBe(true);
    });

    test("should return false for invalid path references", () => {
      expect(PathRepository.isPathRef("a", testState)).toBe(false); // missing $
      expect(PathRepository.isPathRef("$x", testState)).toBe(false); // invalid path
      expect(PathRepository.isPathRef("$b.x", testState)).toBe(false); // invalid nested path
    });

    test("should return false for non-string values", () => {
      expect(PathRepository.isPathRef(123, testState)).toBe(false);
      expect(PathRepository.isPathRef(null, testState)).toBe(false);
      expect(PathRepository.isPathRef(undefined, testState)).toBe(false);
      expect(PathRepository.isPathRef({}, testState)).toBe(false);
    });
  });

  describe("valueFromPath", () => {
    test("should return the correct value for a given path", () => {
      expect(PathRepository.valueFromPath("a", testState)).toBe(1);
      expect(PathRepository.valueFromPath("b.c", testState)).toBe("hello");
      expect(PathRepository.valueFromPath("b.d", testState)).toEqual({
        e: true,
      });
      expect(PathRepository.valueFromPath("b.d.e", testState)).toBe(true);
      expect(PathRepository.valueFromPath("f", testState)).toEqual([1, 2, 3]);
      expect(PathRepository.valueFromPath("g", testState)).toBeNull();
    });

    test("should throw an error for an invalid path", () => {
      expect(() => PathRepository.valueFromPath("x", testState)).toThrow(
        "Invalid path: x",
      );
      expect(() => PathRepository.valueFromPath("a.x", testState)).toThrow(
        "Invalid path: a.x",
      );
      expect(() => PathRepository.valueFromPath("b.d.x", testState)).toThrow(
        "Invalid path: b.d.x",
      );
    });
  });
});
