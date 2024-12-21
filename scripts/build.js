import { build } from "esbuild";
import { esbuildPluginVersionInjector } from "esbuild-plugin-version-injector";

await build({
  entryPoints: [{ in: "src/main.ts", out: "main" }],
  outdir: "dist",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  plugins: [esbuildPluginVersionInjector()],
  minify: true,
});
