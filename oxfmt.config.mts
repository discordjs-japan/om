import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 80,
  sortImports: {
    order: "asc",
    newlinesBetween: false,
  },
  sortPackageJson: false,
  ignorePatterns: [
    "/CHANGELOG.md",
    "/.release-please-manifest.json",
    "package-lock.json",
  ],
});
