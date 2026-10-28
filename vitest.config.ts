import { defineConfig } from "vitest/config"

// Unit and property tests on pure code only: they run in Node, never a browser.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
})
