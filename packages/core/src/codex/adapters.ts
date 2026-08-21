import type { Codex } from "./entity";

// TODO: stronger codecs later (canonical JSON, content-hash + state store) if Map key size/CPU matters.
export const jsonCodex = <T>(): Codex<T> => ({
  key: "JSON",
  encode: async (systemState) => JSON.stringify(systemState) ?? "null",
  decode: async (key) => JSON.parse(key),
});
