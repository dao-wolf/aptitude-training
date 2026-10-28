import { expect, test, type Page } from "@playwright/test"
import {
  expectClockInViewAfterScroll,
  expectDoubleClickMovesOne,
  expectQuestionInView,
  startSprint,
} from "./layout"

// Journeys on a page like the real site: content above the app, a floating
// menu button, and the app in embedded mode. Findings from exploratory testing
// on 28 Oct (plan note §2.8) each have a test here.

async function openHost(page: Page) {
  await page.goto("/host")
  await expect(
    page.getByRole("heading", { name: "Host page heading" })
  ).toBeVisible()
}

test("one main heading on the page: the app doesn't repeat the host's", async ({
  page,
}) => {
  await openHost(page)
  const headings = await page.evaluate(() => {
    const inShadow =
      document
        .querySelector("aptitude-training")
        ?.shadowRoot?.querySelectorAll("h1").length ?? 0
    return document.querySelectorAll("h1").length + inShadow
  })
  expect(headings).toBe(1)
})

test("each screen and question starts in view, clear of the floating button", async ({
  page,
}) => {
  await openHost(page)
  await page.getByRole("button", { name: /^Mixed sprint/ }).click()
  await page
    .getByRole("button", { name: "Continue to the worked example" })
    .click()
  await page.getByRole("button", { name: "Next practice question" }).click()
  await expectQuestionInView(page)
  await page.getByRole("radio").nth(1).check()
  await page.getByRole("button", { name: "Check answer" }).click()
  await page.getByRole("button", { name: "Next practice question" }).click()
  await expectQuestionInView(page)
  await page.getByRole("button", { name: "Skip practice" }).click()
  await page.getByRole("button", { name: "Start" }).click()
  for (let i = 0; i < 4; i++) {
    await expectQuestionInView(page)
    await page.getByRole("button", { name: /^(Next|Skip)$/ }).click()
  }
})

test("a double-click on Next moves one question and answers nothing", async ({
  page,
}) => {
  await openHost(page)
  await startSprint(page)
  await expectDoubleClickMovesOne(page)
})

test("leaving during a test asks first", async ({ page }) => {
  await openHost(page)
  await startSprint(page)
  const prompt = page.waitForEvent("dialog")
  void page.goto("/").catch(() => {})
  const dialog = await prompt
  expect(dialog.type()).toBe("beforeunload")
  await dialog.dismiss()
  await expect(page.locator(".at-count")).toHaveText("Question 1 of 50")
})

test("leaving after the test is finished doesn't ask", async ({ page }) => {
  await openHost(page)
  await startSprint(page)
  await page.getByRole("button", { name: "End test" }).click()
  await page.getByRole("button", { name: "Finish" }).click()
  let asked = false
  page.on("dialog", d => {
    asked = true
    void d.dismiss()
  })
  await page.goto("/")
  expect(asked).toBe(false)
})

test("the clock stays in view while you answer", async ({ page }) => {
  await openHost(page)
  await startSprint(page)
  await expectClockInViewAfterScroll(page)
})

test("picture answers are big enough to tell apart (72 px or more)", async ({
  page,
}) => {
  await page.goto("/host?seed=pics")
  await page.getByRole("button", { name: /^Spatial drill/ }).click()
  await page
    .getByRole("button", { name: "Continue to the worked example" })
    .click()
  await page.getByRole("button", { name: "Skip practice" }).click()
  await page.getByRole("button", { name: "Start" }).click()
  const sizes = await page
    .locator(".at-option svg")
    .evaluateAll(svgs => svgs.map(s => s.getBoundingClientRect().width))
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(72)
})
