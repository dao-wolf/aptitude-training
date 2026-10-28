import js from "@eslint/js"
import tseslint from "typescript-eslint"
import eslintReact from "@eslint-react/eslint-plugin"
import reactHooks from "eslint-plugin-react-hooks"
import noUnsanitized from "eslint-plugin-no-unsanitized"
import globals from "globals"

export default tseslint.config(
  {
    ignores: [
      "dist",
      "reports",
      "coverage",
      "legacy",
      "playwright-report",
      "test-results",
      ".stryker-tmp",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks, "no-unsanitized": noUnsanitized },
    extends: [eslintReact.configs["recommended-typescript"]],
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Security: nothing may write raw HTML or script URLs.
      "no-unsanitized/method": "error",
      "no-unsanitized/property": "error",
      "@eslint-react/dom-no-dangerously-set-innerhtml": "error",
      "@eslint-react/dom-no-script-url": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
    },
  },
  {
    files: ["tests/**/*.{ts,mjs}", "*.config.{ts,js}"],
    languageOptions: { globals: globals.node },
  }
)
