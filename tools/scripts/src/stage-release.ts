#!/usr/bin/env bun
/**
 * Stage @statespace/core under release/ for npm publish.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";

export type StageReleaseOptions = {
  workspaceRoot: string;
  version: string;
  /** Override staged output directory (default: `<workspaceRoot>/release`). */
  releaseDir?: string;
};

export type StageReleaseResult = {
  releaseDir: string;
};

const PACKAGE_DIR = "packages/core";

function copyDirFiltered(src: string, dest: string, skipDirNames: ReadonlySet<string>): void {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    if (skipDirNames.has(entry)) continue;
    const from = path.join(src, entry);
    const to = path.join(dest, entry);
    if (statSync(from).isDirectory()) {
      copyDirFiltered(from, to, skipDirNames);
    } else {
      cpSync(from, to);
    }
  }
}

export async function stageRelease(opts: StageReleaseOptions): Promise<StageReleaseResult> {
  const { workspaceRoot, version } = opts;
  const packageRoot = path.join(workspaceRoot, PACKAGE_DIR);
  const pkgJsonPath = path.join(packageRoot, "package.json");

  if (!existsSync(pkgJsonPath)) {
    throw new Error(`missing package.json at ${packageRoot}`);
  }

  const source = JSON.parse(await Bun.file(pkgJsonPath).text()) as Record<string, unknown>;
  const releaseDir = opts.releaseDir ?? path.join(workspaceRoot, "release");

  if (existsSync(releaseDir)) rmSync(releaseDir, { recursive: true, force: true });
  mkdirSync(releaseDir, { recursive: true });

  const srcDir = path.join(packageRoot, "src");
  if (!existsSync(srcDir)) {
    throw new Error(`missing src at ${packageRoot}`);
  }
  copyDirFiltered(srcDir, path.join(releaseDir, "src"), new Set(["_tests"]));

  const readme = path.join(packageRoot, "README.md");
  if (!existsSync(readme)) {
    throw new Error(`missing README.md at ${packageRoot}`);
  }
  cpSync(readme, path.join(releaseDir, "README.md"));

  const license = path.join(workspaceRoot, "LICENSE");
  if (!existsSync(license)) {
    throw new Error(`missing LICENSE at ${workspaceRoot}`);
  }
  cpSync(license, path.join(releaseDir, "LICENSE"));

  const staged: Record<string, unknown> = {
    name: source.name,
    version,
    description: source.description,
    license: source.license ?? "MIT",
    type: source.type ?? "module",
    module: source.module,
    engines: source.engines,
    repository: source.repository,
    homepage: source.homepage,
    bugs: source.bugs,
    keywords: source.keywords,
    files: source.files ?? ["src", "README.md", "LICENSE"],
    exports: source.exports,
    dependencies: source.dependencies,
    peerDependencies: source.peerDependencies,
    publishConfig: { access: "public", ...(source.publishConfig as object | undefined) },
  };

  await Bun.write(path.join(releaseDir, "package.json"), `${JSON.stringify(staged, null, 2)}\n`);

  return { releaseDir };
}

if (import.meta.main) {
  const version = process.argv[2];
  if (version === undefined || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/.test(version)) {
    console.error("usage: stage-release.ts <semver>");
    process.exit(1);
  }
  const workspaceRoot = path.resolve(import.meta.dir, "../../..");
  const result = await stageRelease({ workspaceRoot, version });
  console.log(`staged → ${path.relative(workspaceRoot, result.releaseDir)}`);
}
