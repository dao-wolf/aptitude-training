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
      const top = document.elementFromPoint(x, y)
      return top === (option.getRootNode() as ShadowRoot).host ||
        option.contains(top)
        ? ""
        : `covered by ${top?.tagName}`
    })
  expect(covered).toBe("")
}

/** Scroll the test header off screen, then expect a clock still on screen and uncovered. */
export async function expectClockInViewAfterScroll(page: Page) {
  // Scroll until the header has really left the screen (no racing a smooth scroll).
  const header = page.locator(".at-test-header")
  await header.evaluate(h =>
    window.scrollBy(0, h.getBoundingClientRect().bottom + 40)
  )
  // On a short page the header can't leave the screen: stop at the page's end.
  await expect
    .poll(() =>
      header.evaluate(
        h =>
          h.getBoundingClientRect().bottom < 0 ||
          Math.ceil(window.scrollY + window.innerHeight) >=
            document.documentElement.scrollHeight
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
