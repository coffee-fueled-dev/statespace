export type Path<T> = T extends object
  ? {
      [K in keyof T]-?: K extends string | number
        ? T[K] extends object
          ? `${K}` | `${K}.${Path<T[K]>}`
          : `${K}`
        : never;
    }[keyof T]
  : never;

const paths = <T extends object>(object: T, prefix = ""): string[] => {
  const _paths: string[] = [];

  for (const key in object) {
    if (object.hasOwnProperty(key)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      _paths.push(currentPath);

      const value = object[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        _paths.push(...paths(value as object, currentPath));
      }
    }
  }

  return _paths;
};

// Type-level check if a string literal is a valid path
export type IsPath<S extends string, T> = S extends Path<T> ? true : false;

export const isPath = <T extends object, S extends string>(
  path: S,
  object: T
): S extends Path<T> ? true : S extends "." ? false : false => {
  if (path === ".") {
    return false as any;
  }
  return paths(object).includes(path) as any;
};

export type Value<T, P extends string> = P extends `${infer K}.${infer R}`
  ? K extends keyof T
    ? Value<T[K], R>
    : never
  : P extends keyof T
  ? T[P]
  : never;
export const pathValue = <T extends object, S extends Path<T>>(
  path: S,
  object: T
): Value<T, S> => {
  const _path = path as string;
  const keys = _path.split(".");

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

export const operationMaintainsType = <T extends object, S extends Path<T>>(
  value: unknown,
  path: S,
  object: T
): value is Value<T, S> => {
  if (!isPath(path, object)) {
    return false;
  }

  // Get the current value at the path path to infer the expected type
  const currentValue = pathValue(path, object);

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
