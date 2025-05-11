import js from "@eslint/js";
import globals from "globals";
import ts from "typescript-eslint";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

const code = "{packages,tests}";
const ignore = "{dist,node_modules,test-results}";

export default ts.config(
  prettierConfig,
  { ignores: [`${ignore}/**`, `${code}/*/${ignore}/**`] },
  {
    files: ["*.{cjs,mjs}", `${code}/**/*.{cjs,mjs}`],
    extends: [js.configs.recommended],
    plugins: { prettierPlugin },
  },
  {
    files: [`${code}/**/*.{js,jsx,ts,tsx}`],
    extends: [js.configs.recommended, ...ts.configs.stylisticTypeChecked, ...ts.configs.strictTypeChecked],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parser: ts.parser,
      parserOptions: { projectService: true },
    },
    plugins: {
      prettierPlugin,
    },
    rules: {
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-exports": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-invalid-void-type": ["error", { allowAsThisParameter: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [{ group: ["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx"] }],
        },
      ],
    },
  },
);
