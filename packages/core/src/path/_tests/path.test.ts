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
  h: [
    { id: 1, name: "first" },
    { id: 2, name: "second" },
  ],
  i: [
    [10, 20],
    [30, 40],
  ],
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
        "f[0]",
        "f[1]",
        "f[2]",
        "g",
        "h",
        "h[0]",
        "h[0].id",
        "h[0].name",
        "h[1]",
        "h[1].id",
        "h[1].name",
        "i",
        "i[0]",
        "i[1]",
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

    test("should traverse into arrays with indexing", () => {
      const stateWithArray = { a: [{ b: 1 }] };
      const expected: string[] = ["a", "a[0]", "a[0].b"];
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

    test("should return true for valid array indexed paths", () => {
      expect(PathRepository.isPath("f[0]", testState)).toBe(true);
      expect(PathRepository.isPath("f[1]", testState)).toBe(true);
      expect(PathRepository.isPath("h[0].id", testState)).toBe(true);
      expect(PathRepository.isPath("h[1].name", testState)).toBe(true);
    });

    test("should return false for invalid paths", () => {
      expect(PathRepository.isPath("x" as any, testState)).toBe(false);
      expect(PathRepository.isPath("a.x" as any, testState)).toBe(false);
      expect(PathRepository.isPath("b.c.x" as any, testState)).toBe(false);
    });

    test("should return false for invalid array indexed paths", () => {
      expect(PathRepository.isPath("f[3]" as any, testState)).toBe(false); // out of bounds
      expect(PathRepository.isPath("f[x]" as any, testState)).toBe(false); // non-numeric index
      expect(PathRepository.isPath("a[0]" as any, testState)).toBe(false); // not an array
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

    test("should return true for valid array indexed path references", () => {
      expect(PathRepository.isPathRef("$f[0]", testState)).toBe(true);
      expect(PathRepository.isPathRef("$h[0].id", testState)).toBe(true);
    });

    test("should return false for invalid path references", () => {
      expect(PathRepository.isPathRef("a", testState)).toBe(false); // missing $
      expect(PathRepository.isPathRef("$x", testState)).toBe(false); // invalid path
      expect(PathRepository.isPathRef("$b.x", testState)).toBe(false); // invalid nested path
      expect(PathRepository.isPathRef("$f[3]", testState)).toBe(false); // out of bounds
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

    test("should return the correct value for array indexed paths", () => {
      expect(PathRepository.valueFromPath("f[0]", testState)).toBe(1);
      expect(PathRepository.valueFromPath("f[1]", testState)).toBe(2);
      expect(PathRepository.valueFromPath("f[2]", testState)).toBe(3);
      expect(PathRepository.valueFromPath("h[0]", testState)).toEqual({
        id: 1,
        name: "first",
      });
      expect(PathRepository.valueFromPath("h[0].id", testState)).toBe(1);
      expect(PathRepository.valueFromPath("h[0].name", testState)).toBe(
        "first"
      );
      expect(PathRepository.valueFromPath("h[1].id", testState)).toBe(2);
      expect(PathRepository.valueFromPath("h[1].name", testState)).toBe(
        "second"
      );
      expect(PathRepository.valueFromPath("i[0]", testState)).toEqual([10, 20]);
      expect(PathRepository.valueFromPath("i[1]", testState)).toEqual([30, 40]);
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

    test("should throw an error for invalid array indexed paths", () => {
      expect(() =>
        PathRepository.valueFromPath("f[3]" as any, testState)
      ).toThrow("Invalid path: f[3]");
      expect(() =>
        PathRepository.valueFromPath("a[0]" as any, testState)
      ).toThrow("Invalid path: a[0]");
      expect(() =>
        PathRepository.valueFromPath("f[x]" as any, testState)
      ).toThrow("Invalid path: non-numeric array index in f[x]");
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

    test("should handle arrays with indexing", () => {
      interface StateWithArray {
        tags: string[];
        items: { id: number }[];
      }

      type ArrayPaths = Path<StateWithArray>;
      const paths: ArrayPaths[] = [
        "tags",
        "tags[0]",
        "items",
        "items[0]",
        "items[0].id",
      ];

      // Arrays should now support indexing
      expect(paths.length).toBe(5);
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

  describe("parsePathSegments", () => {
    test("should parse simple property paths", () => {
      const segments = PathRepository.parsePathSegments("a.b.c");
      expect(segments).toEqual([
        { type: "property", key: "a" },
        { type: "property", key: "b" },
        { type: "property", key: "c" },
      ]);
    });

    test("should parse array indexed paths", () => {
      const segments = PathRepository.parsePathSegments("a[0].b[1]");
      expect(segments).toEqual([
        { type: "property", key: "a" },
        { type: "index", index: 0 },
        { type: "property", key: "b" },
        { type: "index", index: 1 },
      ]);
    });

    test("should parse mixed paths", () => {
      const segments = PathRepository.parsePathSegments(
        "users[0].profile.tags[2]"
      );
      expect(segments).toEqual([
        { type: "property", key: "users" },
        { type: "index", index: 0 },
        { type: "property", key: "profile" },
        { type: "property", key: "tags" },
        { type: "index", index: 2 },
      ]);
    });

    test("should handle single property", () => {
      const segments = PathRepository.parsePathSegments("a");
      expect(segments).toEqual([{ type: "property", key: "a" }]);
    });

    test("should handle single array index", () => {
      const segments = PathRepository.parsePathSegments("a[0]");
      expect(segments).toEqual([
        { type: "property", key: "a" },
        { type: "index", index: 0 },
      ]);
    });

    test("should throw error for unclosed bracket", () => {
      expect(() => PathRepository.parsePathSegments("a[0")).toThrow(
        "Invalid path: unclosed bracket in a[0"
      );
    });

    test("should throw error for non-numeric index", () => {
      expect(() => PathRepository.parsePathSegments("a[x]")).toThrow(
        "Invalid path: non-numeric array index in a[x]"
      );
    });
  });
});
