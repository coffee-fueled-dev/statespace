export type Hash = string;

export type Codex<T = any> = {
  key: string;
  encode: (systemState: T) => Promise<string>;
  decode: (key: Hash) => Promise<T>;
};
