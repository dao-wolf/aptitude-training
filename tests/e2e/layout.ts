import { expect, type Page } from "@playwright/test"

// Checks for the app embedded in a real page: shared by the host-page journeys
// and the live check (tests/live), so both catch the same layout bugs.

/** From the start screen, skip the worked example and practice, then start the sprint. */
export async function startSprint(page: Page) {
  await page.getByRole("button", { name: /^Mixed sprint/ }).click()
  await page
    .getByRole("button", { name: "Continue to the worked example" })
    .click()
  await page.getByRole("button", { name: "Skip practice" }).click()
  await page.getByRole("button", { name: "Start" }).click()
  await expect(page.locator(".at-count")).toHaveText("Question 1 of 50")
}

/** The question can be read and its first answer isn't hidden under anything. */
export async function expectQuestionInView(page: Page) {
  await expect(page.locator(".at-prompt")).toBeInViewport()
  const covered = await page
    .locator(".at-option")
    .first()
    .evaluate(option => {
      const r = option.getBoundingClientRect()
      const x = r.left + 24
      const y = r.top + r.height / 2
      if (y < 0 || y > window.innerHeight) return "off screen"
      // Covered by the page (a menu button), or by the app's own sticky header.
      const root = option.getRootNode() as ShadowRoot
      const top = document.elementFromPoint(x, y)
      if (top !== root.host) return `covered by ${top?.tagName}`
      const inner = root.elementFromPoint(x, y)
      return option.contains(inner) ? "" : `covered by .${inner?.className}`
    })
  expect(covered).toBe("")
}

/**
 * Scroll past where the test header started, then expect a clock still on
 * screen and uncovered: the sticky header's, or the pill's where sticky fails.
 */
export async function expectClockInViewAfterScroll(page: Page) {
  const header = page.locator(".at-test-header")
  const start = await page.evaluate(() => window.scrollY)
  const distance = await header.evaluate(
    h => h.getBoundingClientRect().bottom + 40
  )
  await page.evaluate(d => window.scrollBy(0, d), distance)
  // Wait for the scroll to finish: the distance, or the page's end on a short page.
  await expect
    .poll(() =>
      page.evaluate(
        ({ from, d }) =>
          window.scrollY >= from + d - 1 ||
          Math.ceil(window.scrollY + window.innerHeight) >=
            document.documentElement.scrollHeight,
        { from: start, d: distance }
      )
    )
    .toBe(true)
  // Either the header clock or the clock pill must be on screen and uncovered.
  await expect
    .poll(() =>
      page.locator("aptitude-training").evaluate(host => {
        const clocks = [
          ...(host.shadowRoot?.querySelectorAll<HTMLElement>("[data-clock]") ??
            []),
        ]
        return clocks.some(clock => {
          const r = clock.getBoundingClientRect()
          if (r.bottom <= 0 || r.top >= window.innerHeight || r.width === 0)
            return false
          return (
            document.elementFromPoint(
              r.left + r.width / 2,
              r.top + r.height / 2
            ) === host
          )
        })
      })
    )
    .toBe(true)
}

/** Click Next (or Skip) twice quickly, three times: each moves one question and answers nothing. */
export async function expectDoubleClickMovesOne(page: Page) {
  await page.getByRole("radio").first().check()
  for (let i = 1; i <= 3; i++) {
    await page.getByRole("button", { name: /^(Next|Skip)$/ }).dblclick()
    await expect(page.locator(".at-count")).toHaveText(
      `Question ${i + 1} of 50`
    )
    // Count first: looping over no radios would pass without checking anything.
    await expect(page.getByRole("radio")).toHaveCount(5)
    for (const radio of await page.getByRole("radio").all())
      await expect(radio).not.toBeChecked()
  }
}
