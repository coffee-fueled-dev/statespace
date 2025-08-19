export type Codex<T> = {
  key: string;
  encode: (systemState: T) => Promise<string>;
  decode: (key: string) => Promise<T>;
};
