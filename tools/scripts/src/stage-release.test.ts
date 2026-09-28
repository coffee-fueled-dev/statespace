import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { stageRelease } from "./stage-release.ts";

describe("stageRelease", () => {
  let releaseDir: string | undefined;

  afterEach(() => {
    if (releaseDir !== undefined && existsSync(releaseDir)) {
      rmSync(releaseDir, { recursive: true, force: true });
      releaseDir = undefined;
    }
  });

  test("stages src (without _tests) and publishable package.json", async () => {
    const workspaceRoot = path.resolve(import.meta.dir, "../../..");
    releaseDir = mkdtempSync(path.join(os.tmpdir(), "statespace-stage-"));
    const result = await stageRelease({
      workspaceRoot,
      version: "0.0.0-test",
      releaseDir,
    });
    expect(result.releaseDir).toBe(releaseDir);
    expect(existsSync(path.join(result.releaseDir, "src", "index.ts"))).toBe(true);
    expect(existsSync(path.join(result.releaseDir, "src", "statespace", "_tests"))).toBe(false);
    expect(existsSync(path.join(result.releaseDir, "LICENSE"))).toBe(true);
    expect(existsSync(path.join(result.releaseDir, "README.md"))).toBe(true);

    const pkg = JSON.parse(await Bun.file(path.join(result.releaseDir, "package.json")).text()) as {
      name: string;
      version: string;
      private?: boolean;
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      scripts?: unknown;
      devDependencies?: unknown;
      publishConfig?: { access?: string };
    };
    expect(pkg.name).toBe("@statespace/core");
    expect(pkg.version).toBe("0.0.0-test");
    expect(pkg.private).toBeUndefined();
    expect(pkg.dependencies?.immer).toBeDefined();
    expect(pkg.peerDependencies?.typescript).toBeDefined();
    expect(pkg.scripts).toBeUndefined();
    expect(pkg.devDependencies).toBeUndefined();
    expect(pkg.publishConfig?.access).toBe("public");
  });
});
