import { expect, test, type Page } from "@playwright/test"
import {
  expectClockInViewAfterScroll,
  expectDoubleClickMovesOne,
  expectQuestionInView,
  startSprint,
} from "../e2e/layout"

// After each deploy: the app on the real site page (LIVE_URL), at desktop and
// phone size. It only reads: answers stay in the test browser.

// The site's own page-view analytics, the only other host the page may call.
const ANALYTICS = /(^|\.)(googletagmanager|google-analytics)\.com$/

const errors: string[] = []

test.beforeEach(async ({ page }) => {
  errors.length = 0
  page.on("console", m => {
    if (m.type() === "error") errors.push(m.text())
  })
  page.on("pageerror", e => errors.push(e.message))
  // Answer analytics calls here, so test runs don't count as visits.
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
  const calls = trackCalls(page)
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
  expect(calls).toEqual([])
})

/** Requests that could carry answers: any to a host other than the page's own or its analytics, or any non-GET to its own. */
function trackCalls(page: Page) {
  const own = new URL(page.url()).host
  const calls: string[] = []
  page.on("request", r => {
    const url = new URL(r.url())
    if (url.host === own ? r.method() !== "GET" : !ANALYTICS.test(url.host))
      calls.push(`${r.method()} ${url.origin}${url.pathname}`)
  })
  return calls
}
