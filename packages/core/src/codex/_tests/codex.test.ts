import { describe, test, expect } from "bun:test";
import { jsonCodex } from "../adapters";

describe("jsonCodex", () => {
  const codex = jsonCodex<any>();

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

  test("encoded string should be a base64 string", async () => {
    const simpleObject = { a: 1 };
    const encoded = await codex.encode(simpleObject);
    const base64Regex =
      /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    expect(base64Regex.test(encoded)).toBe(true);
  });

  test("encoded string should be smaller than json string for large objects", async () => {
    const largeObject: { [key: string]: string } = {};
    for (let i = 0; i < 100; i++) {
      largeObject[`key${i}`] = "a".repeat(100);
    }

    const jsonString = JSON.stringify(largeObject);
    const encoded = await codex.encode(largeObject);

    expect(encoded.length).toBeLessThan(jsonString.length);
  });
});
