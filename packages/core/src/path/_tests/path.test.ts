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
        expected.sort()
      );
    });

    test("should not traverse into arrays", () => {
      const stateWithArray = { a: [{ b: 1 }] };
      const expected: string[] = ["a"];
      expect(PathRepository.paths(stateWithArray) as string[]).toEqual(
        expected
      );
    });
  });

  describe("isPath", () => {
    test("should return true for valid paths", () => {
      expect(PathRepository.isPath("a", testState)).toBe(true);
      expect(PathRepository.isPath("b.c", testState)).toBe(true);
      expect(PathRepository.isPath("b.d.e", testState)).toBe(true);
    });

    test("should return false for invalid paths", () => {
      expect(PathRepository.isPath("x" as any, testState)).toBe(false);
      expect(PathRepository.isPath("a.x" as any, testState)).toBe(false);
      expect(PathRepository.isPath("b.c.x" as any, testState)).toBe(false);
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
      expect(() => PathRepository.valueFromPath("x" as any, testState)).toThrow(
        "Invalid path: x"
      );
      expect(() =>
        PathRepository.valueFromPath("a.x" as any, testState)
      ).toThrow("Invalid path: a.x");
      expect(() =>
        PathRepository.valueFromPath("b.d.x" as any, testState)
      ).toThrow("Invalid path: b.d.x");
    });
  });

  describe("Path type inference", () => {
    test("should infer literal types for simple paths", () => {
      interface SimpleState {
        name: string;
        count: number;
      }

      type SimplePaths = Path<SimpleState>;
      const paths: SimplePaths[] = ["name", "count"];

      // This test passes if TypeScript compilation succeeds
      expect(paths).toEqual(["name", "count"]);
    });

    test("should infer literal types for nested paths", () => {
      interface NestedState {
        user: {
          profile: {
            name: string;
            age: number;
          };
          settings: {
            theme: string;
          };
        };
        metadata: {
          version: string;
        };
      }

      type NestedPaths = Path<NestedState>;
      const paths: NestedPaths[] = [
        "user",
        "user.profile",
        "user.profile.name",
        "user.profile.age",
        "user.settings",
        "user.settings.theme",
        "metadata",
        "metadata.version",
      ];

      // This test passes if TypeScript compilation succeeds
      expect(paths.length).toBe(8);
    });

    test("should handle arrays as leaf nodes", () => {
      interface StateWithArray {
        tags: string[];
        items: { id: number }[];
      }

      type ArrayPaths = Path<StateWithArray>;
      const paths: ArrayPaths[] = ["tags", "items"];

      // Arrays should not be traversed into
      expect(paths).toEqual(["tags", "items"]);
    });

    test("should work with the HanoiState example", () => {
      interface HanoiState {
        pegs: number[][];
      }

      type HanoiPaths = Path<HanoiState>;
      const paths: HanoiPaths[] = ["pegs"];

      // Should infer "pegs" as literal type, not string
      expect(paths).toEqual(["pegs"]);
    });
  });
});
