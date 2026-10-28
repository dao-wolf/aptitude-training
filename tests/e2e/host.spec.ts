import { expect, test, type Page } from "@playwright/test"

// Journeys on a page like the real site: content above the app, a floating
// menu button, and the app in embedded mode. Findings from exploratory testing
// on 28 Oct (plan note §2.8) each have a test here.

async function openHost(page: Page) {
  await page.goto("/host")
  await expect(
    page.getByRole("heading", { name: "Host page heading" })
  ).toBeVisible()
}

async function startSprint(page: Page) {
  await page.getByRole("button", { name: /^Mixed sprint/ }).click()
  await page
    .getByRole("button", { name: "Continue to the worked example" })
    .click()
  await page.getByRole("button", { name: "Skip practice" }).click()
  await page.getByRole("button", { name: "Start" }).click()
  await expect(page.locator(".at-count")).toHaveText("Question 1 of 50")
}

/** The question can be read and its first answer isn't hidden under anything. */
async function expectQuestionInView(page: Page) {
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

test("moving on quickly still shows the whole question", async ({ page }) => {
  await openHost(page)
  await startSprint(page)
  // Click as soon as each question appears, while the page may still be scrolling.
  for (let i = 0; i < 6; i++) {
    await page.getByRole("button", { name: /^(Next|Skip)$/ }).click()
    await expectQuestionInView(page)
  }
})

test("a double-click on Next moves one question and answers nothing", async ({
  page,
}) => {
  await openHost(page)
  await startSprint(page)
  await page.getByRole("radio").first().check()
  for (let i = 1; i <= 3; i++) {
    await page.getByRole("button", { name: /^(Next|Skip)$/ }).dblclick()
    await expect(page.locator(".at-count")).toHaveText(
      `Question ${i + 1} of 50`
    )
    for (const radio of await page.getByRole("radio").all())
      await expect(radio).not.toBeChecked()
  }
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
  // Scroll until the header has really left the screen (no racing a smooth scroll).
  const header = page.locator(".at-test-header")
  await header.evaluate(h =>
    window.scrollBy(0, h.getBoundingClientRect().bottom + 40)
  )
  await expect
    .poll(() => header.evaluate(h => h.getBoundingClientRect().bottom))
    .toBeLessThan(0)
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
