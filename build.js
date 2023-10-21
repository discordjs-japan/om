import { build } from "esbuild";
import packageJson from "./package.json" assert { type: "json" };

const buildOptions = {
  bundle: true,
  platform: "node",
  format: "esm",
  external: Object.keys(packageJson.dependencies),
  minify: true,
}

await build({
  ...buildOptions,
  entryPoints: ["src/main.ts"],
  outfile: "dist/main.js",
});

await build({
  ...buildOptions,
  entryPoints: ["src/synthesis/task.ts"],
  outfile: "dist/task.js",
});
