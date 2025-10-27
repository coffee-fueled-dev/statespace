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
        if (value && typeof value === "object") {
          if (Array.isArray(value)) {
            // Add array indexing paths
            for (let i = 0; i < value.length; i++) {
              const indexPath = `${currentPath}[${i}]`;
              _paths.push(indexPath as TPath);

              // If array element is an object, recursively add its paths
              if (
                value[i] &&
                typeof value[i] === "object" &&
                !Array.isArray(value[i])
              ) {
                _paths.push(
                  ...PathRepository.paths(value[i] as object, indexPath)
                );
              }
            }
          } else {
            // Regular object traversal
            _paths.push(...PathRepository.paths(value as object, currentPath));
          }
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

    // Parse path segments that can include array indexing
    const segments = PathRepository.parsePathSegments(path);

    let current: any = state;
    for (const segment of segments) {
      if (segment.type === "property") {
        if (current && typeof current === "object" && segment.key in current) {
          current = current[segment.key];
        } else {
          throw new Error("Invalid path: " + path);
        }
      } else if (segment.type === "index") {
        if (
          Array.isArray(current) &&
          segment.index >= 0 &&
          segment.index < current.length
        ) {
          current = current[segment.index];
        } else {
          throw new Error("Invalid path: " + path);
        }
      }
    }

    return current as TValue;
  },

  // Helper method to parse path segments
  parsePathSegments: (path: string) => {
    const segments: Array<
      { type: "property"; key: string } | { type: "index"; index: number }
    > = [];
    let i = 0;

    while (i < path.length) {
      if (path[i] === "[") {
        // Parse array index
        const start = i + 1;
        const end = path.indexOf("]", start);
        if (end === -1) {
          throw new Error("Invalid path: unclosed bracket in " + path);
        }
        const indexStr = path.slice(start, end);
        const index = parseInt(indexStr, 10);
        if (isNaN(index)) {
          throw new Error("Invalid path: non-numeric array index in " + path);
        }
        segments.push({ type: "index", index });
        i = end + 1;

        // Skip dot after bracket if present
        if (i < path.length && path[i] === ".") {
          i++;
        }
      } else {
        // Parse property name
        let end = i;
        while (end < path.length && path[end] !== "." && path[end] !== "[") {
          end++;
        }
        const key = path.slice(i, end);
        if (key) {
          segments.push({ type: "property", key });
        }
        i = end;

        // Skip dot
        if (i < path.length && path[i] === ".") {
          i++;
        }
      }
    }

    return segments;
  },
};
