import { expect, test, type Page } from "@playwright/test"
import { chooseTest, open } from "./helpers"

// The narrowest common phone: nothing may scroll sideways (WCAG 1.4.10 Reflow)
// and every control must be big enough to tap (44 px).
test.use({
  viewport: { width: 320, height: 640 },
  hasTouch: true,
  isMobile: true,
})

async function expectFitsAndTappable(page: Page, screen: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  )
  expect(overflow, `${screen}: sideways scroll`).toBeLessThanOrEqual(0)
  const small = await page.locator("aptitude-training").evaluate(host => {
    const root = host.shadowRoot
    if (!root) return ["no shadow root"]
    return [
      ...root.querySelectorAll<HTMLElement>(
        "button, label.at-option, label.at-choice, label.at-chip, summary"
      ),
    ]
      .filter(el => el.offsetParent !== null)
      .map(el => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.height < 44 || r.width < 44)
      .map(
        ({ el, r }) =>
          `${el.textContent?.trim().slice(0, 30)} (${Math.round(r.width)}×${Math.round(r.height)})`
      )
  })
  expect(small, `${screen}: controls under 44 px`).toEqual([])
}

/** Answer through the paper until both a text and a picture question have been checked. */
async function checkBothQuestionKinds(page: Page) {
  const seen = new Set<string>()
  for (let i = 0; i < 50 && seen.size < 2; i++) {
    const kind =
      (await page.locator(".at-options-visual").count()) > 0
        ? "picture question"
        : "text question"
    if (!seen.has(kind)) await expectFitsAndTappable(page, kind)
    seen.add(kind)
    await page.getByRole("radio").first().tap()
    await page.getByRole("button", { name: /^(Next|Skip)$/ }).tap()
  }
  expect([...seen].sort()).toEqual(["picture question", "text question"])
}

test("every screen fits a 320 px phone and every control is tappable", async ({
  page,
}) => {
  await open(page, "?seed=m0b1le")
  await expectFitsAndTappable(page, "landing")

  await chooseTest(page, "Mixed sprint")
  await page.getByText("Options").click()
  await expectFitsAndTappable(page, "instructions")

  await page
    .getByRole("button", { name: "Continue to the worked example" })
    .click()
  await expectFitsAndTappable(page, "worked example")
  await page.getByRole("button", { name: "Skip practice" }).click()
  await page.getByRole("button", { name: "Start" }).click()

  await checkBothQuestionKinds(page)

  await page.getByRole("button", { name: "End test" }).tap()
  await page.getByRole("button", { name: "Finish" }).tap()
  await expectFitsAndTappable(page, "results")
  await page.getByRole("button", { name: "Review answers" }).tap()
  await expectFitsAndTappable(page, "review")
})

test("answers by tap, not just by keyboard", async ({ page }) => {
  await open(page)
  await chooseTest(page, "Spatial drill")
  await page
    .getByRole("button", { name: "Continue to the worked example" })
    .tap()
  await page.getByRole("button", { name: "Skip practice" }).tap()
  await page.getByRole("button", { name: "Start" }).tap()
  await page.getByRole("radio").nth(2).tap()
  await expect(page.getByRole("radio").nth(2)).toBeChecked()
  await page.getByRole("button", { name: "Next" }).tap()
  await expect(page.locator(".at-count")).toHaveText("Question 2 of 10")
})
