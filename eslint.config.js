// @ts-check

import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginImportX from "eslint-plugin-import-x";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    plugins: {
      import: eslintPluginImportX,
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
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: { arguments: false },
        },
      ],
    },
  },
  { ignores: ["dist/", ".husky/install.mjs"] },
  eslintConfigPrettier,
);
