import type { System } from "../shared/types";

/**
 * Recursively extracts all dot-notated paths from a nested object
 */
export function getDotPaths<TSystem extends System>(
  obj: TSystem,
  prefix = ""
): string[] {
  const paths: string[] = [];

  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const currentPath = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];

        // Always add the current path
        paths.push(currentPath);

        // If the value is an object (but not an array or null), recurse
        if (value && typeof value === "object" && !Array.isArray(value)) {
          const nestedPaths = getDotPaths(
            value as Record<string, unknown>,
            currentPath
          );
          paths.push(...nestedPaths);
        }
      }
    }
  }

  return paths;
}
