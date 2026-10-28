import { defineConfig, devices } from "@playwright/test"

// The live check: tests/live against the real site page after a deploy.
//   pnpm e2e:live                                        daowolf.com
//   LIVE_URL=http://localhost:4324/aptitude-training/ pnpm e2e:live   a local site build
const url = process.env.LIVE_URL ?? "https://daowolf.com/aptitude-training/"

export default defineConfig({
  testDir: "tests/live",
  retries: 1,
  reporter: "list",
  use: { baseURL: url, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
})
