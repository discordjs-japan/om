import { spawnSync } from "node:child_process";
import type { RolldownOptions } from "rolldown";
import { defineConfig } from "rolldown/config";
import { replacePlugin } from "rolldown/plugins";
import packageJson from "./package.json" with { type: "json" };

/**
 * バージョン文字列を決める。優先順位は次のとおり。
 *
 * 1. `--environment="OM_VERSION:値"`(rolldown の CLI 引数) あるいは、環境変数 `OM_VERSION`
 * 2. `git describe` の出力(`version:git-describe` スクリプト経由)
 * 3. `package.json` の `version`(フォールバック)
 *
 * `git describe` の出力はタグ上なら `vX.Y.Z`、タグから進んでいれば
 * `vX.Y.Z-<コミット数>-g<短縮 SHA>`、未コミットの変更があれば `-dirty` が付く。
 * 該当するタグが無ければ短縮 SHA になる。
 */
function resolveVersion(): string {
  const fromEnvironment = process.env.OM_VERSION?.trim() ?? "";
  if (fromEnvironment.length >= 1) return fromEnvironment;

  const { status, stdout } = spawnSync(
    "npm run --silent version:git-describe",
    {
      encoding: "utf8",
      // Windows では npm の実体が npm.cmd であるため、shell なしでは spawn できない
      shell: true,
    },
  );

  if (status === 0) return stdout.trim();

  return `v${packageJson.version}`;
}

const VERSION_PLACEHOLDER = "[VI]{{inject}}[/VI]";

export default defineConfig({
  input: "src/main.ts",
  platform: "node",
  external: /^[^./](?!:[/\\])/,
  plugins: [
    replacePlugin(
      { [VERSION_PLACEHOLDER]: resolveVersion() },
      { delimiters: ['"', '"'] },
    ),
  ],
  output: {
    file: "dist/main.js",
    format: "esm",
    minify: true,
    sourcemap: true,
  },
} satisfies RolldownOptions);
