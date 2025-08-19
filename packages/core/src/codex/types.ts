export type Codex<T> = {
  encode: (systemState: T) => Promise<string>;
  decode: (key: string) => Promise<T>;
};
