// @ts-check

import { build } from "esbuild";
import esbuildPluginMetadataInjector from "./esbuild-plugin-metadata-injector/plugin.js";
import packageJson from "./package.json" with { type: "json" };

await build({
  entryPoints: [{ in: "src/main.ts", out: "main" }],
  outdir: "dist",
  bundle: true,
  platform: "node",
  format: "esm",
  external: Object.keys(packageJson.dependencies),
  plugins: [esbuildPluginMetadataInjector()],
  minify: true,
});
