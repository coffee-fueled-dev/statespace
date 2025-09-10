import type { Path, IPathRepository, Value } from "./domain";

export const PathRepository: IPathRepository = {
  paths: (object, prefix = "") => {
    type TState = typeof object;
    type TPath = Path<TState>;

    const _paths: TPath[] = [];

    for (const key in object) {
      if (object.hasOwnProperty(key)) {
        const currentPath = prefix ? `${prefix}.${key}` : key;
        _paths.push(currentPath as TPath);

        const value = object[key];
        if (value && typeof value === "object" && !Array.isArray(value)) {
          _paths.push(...PathRepository.paths(value as object, currentPath));
        }
      }
    }

    return _paths;
  },

  isPath: (path, object) => {
    if (path === ".") {
      return false;
    }
    return (PathRepository.paths(object) as string[]).includes(path);
  },

  isPathRef: (maybeRef, state) =>
    typeof maybeRef === "string" &&
    maybeRef.startsWith("$") &&
    PathRepository.isPath(maybeRef.slice(1), state),

  valueFromPath: (path, state) => {
    type TState = typeof state;
    type TPath = typeof path;
    type TValue = Value<TState, TPath>;

    const keys = path.split(".");

    let current: any = state;
    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        throw new Error("Invalid path: " + path);
      }
    }

    return current as TValue;
  },
};
