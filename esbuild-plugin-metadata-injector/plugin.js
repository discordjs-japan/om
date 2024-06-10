// @ts-check

import { fileURLToPath } from "node:url";
import * as placeholder from "./placeholder.js";

/**
 * @param {string} path
 * @returns {RegExp}
 */
function exact(path) {
  return new RegExp(`^${path.replace(/[/.]/g, "\\$&")}$`);
}

const target = fileURLToPath(import.meta.resolve("./placeholder.js"));

/**
 * @returns {import("esbuild").Plugin}
 */
export default function esbuildPluginMetadataInjector() {
  return {
    name: "esbuild-plugin-metadata-injector",
    setup(build) {
      build.onLoad({ filter: exact(target) }, () => ({
        loader: "json",
        contents: JSON.stringify(placeholder),
      }));
    },
  };
}
