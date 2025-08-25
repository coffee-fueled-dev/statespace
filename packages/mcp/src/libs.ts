import z from "zod";

export const semVer = z
  .string()
  .refine(
    (val) => {
      // Official semver regex pattern
      const semverRegex =
        /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
      return semverRegex.test(val);
    },
    {
      message:
        "Must be a valid semantic version (e.g., 1.0.0, 1.2.3-alpha.1, 2.0.0+build.123)",
    }
  )
  .transform((val) => val as `${number}.${number}.${number}`);
