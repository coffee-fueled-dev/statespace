export type KeyGenerator<T> = {
  encode: (systemState: T) => Promise<string>;
  decode: (key: string) => Promise<T>;
};
