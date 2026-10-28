import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

// Step 1 gate: React inside an open shadow root keeps focus, announcements,
// keyboard use and axe working, under a strict CSP.
test.describe("shadow root spike", () => {
  test.beforeEach(async ({ page }) => {
    const violations: string[] = []
    page.on("console", m => {
      if (m.type() === "error") violations.push(m.text())
    })
    page.on("pageerror", e => violations.push(e.message))
    await page.goto("/")
    await expect(
      page.getByRole("heading", { name: "Aptitude Training" })
    ).toBeVisible()
    expect(violations).toEqual([])
  })

  test("keyboard: pick an option and move on, focus lands on the new question", async ({
    page,
  }) => {
    await page.getByRole("radio", { name: "Option B" }).focus()
    await page.keyboard.press("Space")
    await expect(page.getByRole("radio", { name: "Option B" })).toBeChecked()
    await page.getByRole("button", { name: "Next" }).focus()
    await page.keyboard.press("Enter")
    await expect(
      page.getByRole("heading", { name: "Second question" })
    ).toBeFocused()
    await expect(page.getByText("Question 2 of 3")).toBeVisible()
    await expect(
      page.getByRole("radio", { name: "Option B" })
    ).not.toBeChecked()
  })

  test("styles load inside the shadow root under a strict CSP", async ({
    page,
  }) => {
    const minHeight = await page
      .getByRole("button", { name: "Next" })
      .evaluate(el => getComputedStyle(el).minHeight)
    expect(minHeight).toBe("44px")
  })

  test("no axe violations", async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include("aptitude-training")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze()
    expect(results.violations.map(v => v.id)).toEqual([])
  })
})
