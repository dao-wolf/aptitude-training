// Mutation testing: Stryker changes the pure domain code on purpose, and the
// unit tests must notice. The UI is covered by the Playwright journeys instead.
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  // Listed explicitly: pnpm keeps them out of reach of auto-discovery.
  plugins: [
    "@stryker-mutator/vitest-runner",
    "@stryker-mutator/typescript-checker",
  ],
  testRunner: "vitest",
  vitest: { configFile: "vitest.config.ts" },
  checkers: ["typescript"],
  tsconfigFile: "tsconfig.json",
  mutate: ["src/domain/**/*.ts", "!src/domain/types.ts"],
  thresholds: { high: 85, low: 70, break: 70 },
  incremental: true,
  incrementalFile: "reports/stryker-incremental.json",
  reporters: ["clear-text", "progress", "html", "json"],
  concurrency: 4,
  timeoutMS: 10000,
}
