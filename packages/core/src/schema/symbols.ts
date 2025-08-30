export type Symbol<T> = T extends object
  ? {
      [K in keyof T]-?: K extends string | number
        ? T[K] extends object
          ? `${K}` | `${K}.${Symbol<T[K]>}`
          : `${K}`
        : never;
    }[keyof T]
  : never;

const symbols = <T extends object>(object: T, prefix = ""): string[] => {
  const paths: string[] = [];

  for (const key in object) {
    if (object.hasOwnProperty(key)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      paths.push(currentPath);

      const value = object[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        paths.push(...symbols(value as object, currentPath));
      }
    }
  }

  return paths;
};

// Type-level check if a string literal is a valid symbol
export type IsSymbol<S extends string, T> = S extends Symbol<T> ? true : false;

export const isSymbol = <T extends object, S extends string>(
  symbol: S,
  object: T
): S extends Symbol<T> ? true : S extends "." ? false : false => {
  if (symbol === ".") {
    return false as any;
  }
  return symbols(object).includes(symbol) as any;
};

export type Value<T, P extends string> = P extends `${infer K}.${infer R}`
  ? K extends keyof T
    ? Value<T[K], R>
    : never
  : P extends keyof T
  ? T[P]
  : never;
export const symbolValue = <T extends object, S extends Symbol<T>>(
  symbol: S,
  object: T
): Value<T, S> => {
  const path = symbol as string;
  const keys = path.split(".");

  let current: any = object;
  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = current[key];
    } else {
      return undefined as any;
    }
  }

  return current as Value<T, S>;
};

export const operationMaintainsType = <T extends object, S extends Symbol<T>>(
  value: unknown,
  symbol: S,
  object: T
): value is Value<T, S> => {
  if (!isSymbol(symbol, object)) {
    return false;
  }

  // Get the current value at the symbol path to infer the expected type
  const currentValue = symbolValue(symbol, object);

  // Basic runtime type checking
  if (typeof currentValue === "number") {
    return typeof value === "number";
  }
  if (typeof currentValue === "string") {
    return typeof value === "string";
  }
  if (typeof currentValue === "boolean") {
    return typeof value === "boolean";
  }
  if (currentValue === null) {
    return value === null;
  }
  if (currentValue === undefined) {
    return value === undefined;
  }
  if (typeof currentValue === "object") {
    return typeof value === "object" && value !== null;
  }
  if (Array.isArray(currentValue)) {
    return Array.isArray(value);
  }

  // For other types, just check they're the same type
  return typeof value === typeof currentValue;
};
