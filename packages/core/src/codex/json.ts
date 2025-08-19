import { gzip, gunzip } from "zlib";
import { promisify } from "util";
import type { Codex } from "./types";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * A helper function to create a unique string key for a system state.
 * This is crucial for the visitedCosts map to work correctly.
 */
export const jsonCodex = <T>(): Codex<T> => ({
  key: "json",
  encode: async (systemState) => {
    const jsonString = JSON.stringify(systemState);
    const compressed = await gzipAsync(Buffer.from(jsonString, "utf8"));
    return compressed.toString("base64");
  },
  decode: async (key) => {
    const compressed = Buffer.from(key, "base64");
    const decompressed = await gunzipAsync(compressed);
    return JSON.parse(decompressed.toString("utf8"));
  },
});
