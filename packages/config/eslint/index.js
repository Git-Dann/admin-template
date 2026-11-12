import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";
import { designRules } from "./design-rules.js";

/** Base config for every package and app. */
export default tseslint.config(
  { ignores: ["**/dist/**", "**/.next/**", "**/storybook-static/**", "**/node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { "react-hooks": reactHooks, "jsx-a11y": jsxA11y, gitwork: designRules },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      "jsx-a11y/aria-role": ["error", { ignoreNonDOM: true }],
      "gitwork/no-raw-colours": "error",
      "gitwork/no-crescent-border": "error",
      "gitwork/no-theme-vars": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
);
