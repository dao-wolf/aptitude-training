import { defineConfig, devices } from "@playwright/test"

// Journeys run against the built element (dist/), served with a strict CSP.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4180",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node tests/e2e/server.mjs",
    url: "http://127.0.0.1:4180/health",
    reuseExistingServer: !process.env.CI,
  },
  // Chromium only, by choice (Chrome, Edge and other Chromium browsers), on
  // desktop and on an emulated phone with touch: mobile matters most.
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /mobile\.spec/,
    },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
})
