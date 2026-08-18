export type Hash = string;

export type Codex<T = unknown> = {
  key: string;
  encode: (systemState: T) => Promise<string>;
  decode: (key: Hash) => Promise<T>;
};
