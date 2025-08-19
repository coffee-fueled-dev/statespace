import { Codex as StatespaceCodex } from "@statespace/memgraph";

export type Codex<T extends any = any> = {
  key: StatespaceCodex;
  encode: (systemState: T) => Promise<string>;
  decode: (key: string) => Promise<T>;
};
