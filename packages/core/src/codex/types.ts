export type Codex<T = any> = {
  key: string;
  encode: (systemState: T) => Promise<string>;
  decode: (key: string) => Promise<T>;
};
