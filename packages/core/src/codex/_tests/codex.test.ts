import { describe, expect, test } from "bun:test";
import { jsonCodex } from "../adapters";

describe("jsonCodex", () => {
  const codex = jsonCodex<unknown>();

  test("should have the key 'JSON'", () => {
    expect(codex.key).toBe("JSON");
  });

  test("should encode and decode a simple object", async () => {
    const simpleObject = { a: 1, b: "hello" };
    const encoded = await codex.encode(simpleObject);
    const decoded = await codex.decode(encoded);
    expect(decoded).toEqual(simpleObject);
  });

  test("should encode and decode a complex object", async () => {
    const complexObject = {
      a: 1,
      b: {
        c: "hello",
        d: [true, false, null, { e: 3.14 }],
      },
      f: undefined, // JSON.stringify will remove this
    };
    const expectedObject = {
      a: 1,
      b: {
        c: "hello",
        d: [true, false, null, { e: 3.14 }],
      },
    };
    const encoded = await codex.encode(complexObject);
    const decoded = await codex.decode(encoded);
    expect(decoded).toEqual(expectedObject);
  });

  test("should handle an empty object", async () => {
    const emptyObject = {};
    const encoded = await codex.encode(emptyObject);
    const decoded = await codex.decode(encoded);
    expect(decoded).toEqual(emptyObject);
  });

  test("should handle an array", async () => {
    const array = [1, "test", { a: 1 }];
    const encoded = await codex.encode(array);
    const decoded = await codex.decode(encoded);
    expect(decoded).toEqual(array);
  });

  test("encoded string should equal JSON.stringify", async () => {
    const simpleObject = { a: 1, b: "hello" };
    const encoded = await codex.encode(simpleObject);
    expect(encoded).toBe(JSON.stringify(simpleObject));
  });

  test("encode falls back to null JSON when stringify returns undefined", async () => {
    const encoded = await codex.encode(undefined);
    expect(encoded).toBe("null");
    expect(typeof encoded).toBe("string");
    expect(await codex.decode(encoded)).toBeNull();
  });
});
