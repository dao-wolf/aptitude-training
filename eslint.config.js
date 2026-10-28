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
      // Lists here are static content that never reorders, so index keys are right.
      "@eslint-react/no-array-index-key": "off",
      // Same limits as CodeScene's code health checks, so they fail here first.
      complexity: ["error", 9],
      "max-lines-per-function": [
        "error",
        { max: 120, skipBlankLines: true, skipComments: true },
      ],
      // A strict CSP blocks inline style attributes: all styling lives in the stylesheet.
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='style']",
          message: "Use a class: a strict CSP blocks inline styles.",
        },
      ],
    },
  },
  {
    files: ["tests/**/*.{ts,mjs}", "*.config.{ts,js}"],
    languageOptions: { globals: globals.node },
    rules: { complexity: ["error", 8] },
  }
)
