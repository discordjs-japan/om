import type { RolldownOptions } from "rolldown";
import { defineConfig } from "rolldown/config";
import { replacePlugin } from "rolldown/plugins";
import packageJson from "./package.json" with { type: "json" };

export default defineConfig({
  input: "src/main.ts",
  platform: "node",
  external: /^[^./](?!:[/\\])/,
  plugins: [
    replacePlugin(
      { "[VI]{{inject}}[/VI]": packageJson.version },
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
