import { build } from "esbuild";
import { esbuildPluginVersionInjector } from "esbuild-plugin-version-injector";
import packageJson from "./package.json" with { type: "json" };

await build({
  entryPoints: [
    { in: "src/main.ts", out: "main" },
    { in: "src/synthesis/task.ts", out: "task" },
  ],
  outdir: "dist",
  bundle: true,
  platform: "node",
  format: "esm",
  external: Object.keys(packageJson.dependencies),
  plugins: [esbuildPluginVersionInjector()],
  minify: true,
});
