// @ts-check

import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
// @ts-expect-error `eslint-plugin-import` is not typed
import eslintPluginImport from "eslint-plugin-import";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    plugins: {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- `eslint-plugin-import` is not typed
      import: eslintPluginImport,
    },
    languageOptions: {
      parserOptions: {
        sourceType: "module",
        ecmaVersion: "latest",
        project: ["tsconfig.json", "tsconfig.*.json"],
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "import/order": [
        "error",
        {
          alphabetize: { order: "asc" },
          "newlines-between": "never",
        },
      ],
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  { ignores: ["dist/", ".husky/install.mjs"] },
  eslintConfigPrettier,
);
