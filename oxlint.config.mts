import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["eslint", "typescript", "unicorn", "oxc"],
  categories: {
    correctness: "error",
  },
  rules: {
    "typescript/restrict-template-expressions": "off",
    "typescript/no-base-to-string": "off",
    "typescript/no-misused-promises": [
      "error",
      {
        checksVoidReturn: { arguments: false },
      },
    ],
  },
  env: {
    node: true,
  },
  ignorePatterns: ["dist/", ".husky/install.mjs"],
  options: {
    typeAware: true,
    typeCheck: true,
  },
});
