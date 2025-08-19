import { Codex as MemgraphCodex } from "@statespace/memgraph";

export type Codex<T> = {
  key: MemgraphCodex;
  encode: (systemState: T) => Promise<string>;
  decode: (key: string) => Promise<T>;
};
