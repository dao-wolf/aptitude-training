import { createHash } from "node:crypto"
import { expect, test, type Page } from "@playwright/test"
import {
  expectClockInViewAfterScroll,
  expectDoubleClickMovesOne,
  expectQuestionInView,
  startSprint,
} from "../e2e/layout"

// After each deploy: the app on the real site page (LIVE_URL), at desktop and
// phone size. It only reads: answers stay in the test browser.

// The site's own page-view analytics, answered here so test runs don't count as visits.
const ANALYTICS = /(^|\.)(googletagmanager|google-analytics)\.com$/
// Every site page also loads its fonts from Google Fonts.
const FONTS = /^fonts\.(googleapis|gstatic)\.com$/

const errors: string[] = []
// Requests that could carry answers, recorded from before the page loads.
let calls: string[] = []

test.beforeEach(async ({ page, baseURL }) => {
  errors.length = 0
  calls = trackCalls(page, new URL(baseURL ?? "").host)
  page.on("console", m => {
    if (m.type() === "error") errors.push(m.text())
  })
  page.on("pageerror", e => errors.push(e.message))
  await page.route(
    url => ANALYTICS.test(url.host),
    route => route.fulfill({ status: 204, body: "" })
  )
  await page.goto("")
  await expect(
    page.getByRole("button", { name: /^Mixed sprint/ })
  ).toBeVisible()
})

test.afterEach(() => {
  expect(errors).toEqual([])
  expect(calls).toEqual([])
})

test("serves the app with its stylesheet, and the app adds no main heading", async ({
  page,
}) => {
  const app = await page.locator("aptitude-training").evaluate(host => ({
    styled: [
      ...(host.shadowRoot?.querySelectorAll<HTMLLinkElement>(
        'link[rel="stylesheet"]'
      ) ?? []),
    ].some(link => link.sheet !== null),
    headings: host.shadowRoot?.querySelectorAll("h1").length,
  }))
  expect(app).toEqual({ styled: true, headings: 0 })
})

test("each question starts in view, clear of the menu button", async ({
  page,
}) => {
  await startSprint(page)
  for (let i = 0; i < 4; i++) {
    await expectQuestionInView(page)
    await page.getByRole("button", { name: /^(Next|Skip)$/ }).click()
  }
})

test("the clock stays in view while you answer", async ({ page }) => {
  await startSprint(page)
  await expectClockInViewAfterScroll(page)
})

test("a double-click on Next moves one question and answers nothing", async ({
  page,
}) => {
  await startSprint(page)
  await expectDoubleClickMovesOne(page)
})

test("leaving during a test asks first", async ({ page }) => {
  await startSprint(page)
  const prompt = page.waitForEvent("dialog")
  void page.goto("/").catch(() => {})
  const dialog = await prompt
  expect(dialog.type()).toBe("beforeunload")
  await dialog.dismiss()
  await expect(page.locator(".at-count")).toHaveText("Question 1 of 50")
})

test("a test runs to the result and review, and nothing leaves the browser", async ({
  page,
}) => {
  await startSprint(page)
  await page.getByRole("radio").first().check()
  await page.getByRole("button", { name: "Next" }).click()
  await page.getByRole("button", { name: "End test" }).click()
  await page.getByRole("button", { name: "Finish" }).click()
  await expect(page.getByRole("heading", { name: "Your result" })).toBeVisible()
  await expect(page.getByText(/of 50 correct/)).toBeVisible()
  await page
    .getByRole("button", { name: /^Question 1: (right|wrong)$/ })
    .click()
  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible()
})

test("serves the signed release's files, byte for byte", async ({
  page,
  request,
}) => {
  const src = await page
    .locator('script[src*="/tools/aptitude-training/"]')
    .getAttribute("src")
  const version = /\/tools\/aptitude-training\/([^/]+)\//.exec(src ?? "")?.[1]
  expect(version, "the page loads a versioned tool path").toBeTruthy()
  const sums = await request.get(
    `https://github.com/dao-wolf/aptitude-training/releases/download/v${version}/SHA256SUMS`
  )
  expect(sums.ok(), "the release has SHA256SUMS").toBe(true)
  const expected = (await sums.text()).trim().split("\n")
  expect(expected).toHaveLength(2)
  for (const line of expected) {
    const [hash, file] = line.split(/\s+\*?/)
    const served = await request.get(
      new URL(`${file}`, new URL(src!, page.url())).href
    )
    expect(served.ok(), file).toBe(true)
    const actual = createHash("sha256")
      .update(await served.body())
      .digest("hex")
    expect(actual, file).toBe(hash)
  }
})

/**
 * Requests that could carry answers: to any host but the page's own, its
 * analytics or its fonts, or to its own with a method other than GET or with
 * a query string.
 */
function trackCalls(page: Page, own: string) {
  const found: string[] = []
  page.on("request", r => {
    const url = new URL(r.url())
    const risky =
      url.host === own
        ? r.method() !== "GET" || url.search !== ""
        : !ANALYTICS.test(url.host) && !FONTS.test(url.host)
    if (risky)
      found.push(`${r.method()} ${url.origin}${url.pathname}${url.search}`)
  })
  return found
}
