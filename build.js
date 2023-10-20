import { build } from "esbuild";
import packageJson from "./package.json" assert { type: "json" };

await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "dist/main.js",
  platform: "node",
  format: "esm",
  external: Object.keys(packageJson.dependencies),
  minify: true,
});

await build({
  entryPoints: ["src/synthesis/task.ts"],
  bundle: true,
  outfile: "dist/task.js",
  platform: "node",
  format: "esm",
  external: Object.keys(packageJson.dependencies),
  minify: true,
});
