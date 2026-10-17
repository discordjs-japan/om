#!/usr/bin/env node
/**
 * node-bundled-npm
 *
 * Applies the npm version bundled with devEngines.runtime's Node.js
 * to devEngines.packageManager.version. Repo-local action; assumes valid
 * shapes and crashes otherwise.
 */

import { appendFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PACKAGE_JSON_PATH = "./package.json";
const INDEX_URL = "https://nodejs.org/dist/index.json";

const resolvedPackageJsonPath = path.resolve(
  process.env.GITHUB_WORKSPACE ?? process.cwd(),
  PACKAGE_JSON_PATH,
);
const raw = await readFile(resolvedPackageJsonPath, "utf8");
const packageJson = JSON.parse(raw) as Record<string, unknown> & {
  devEngines: {
    runtime: { version: string };
    packageManager: { version: string };
  };
};

const index = (await (await fetch(INDEX_URL)).json()) as (Record<
  string,
  unknown
> & { version: string; npm?: string })[];
const nodeVersion = packageJson.devEngines.runtime.version;
const release = index.find((release) => release.version === `v${nodeVersion}`)!;
const npmVersion = release.npm!;

packageJson.devEngines.packageManager.version = npmVersion;

const updated = `${JSON.stringify(packageJson, null, 2)}\n`;
const changed = updated !== raw;
if (changed) {
  await writeFile(resolvedPackageJsonPath, updated);
}
if (typeof process.env.GITHUB_OUTPUT === "string") {
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `npm-version=${npmVersion}\nnodeVersion=${nodeVersion}\nchanged=${changed}\n`,
  );
}
