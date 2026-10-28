import { expect, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

/** Open the test page and fail on any console error or uncaught exception (incl. CSP violations). */
export async function open(page: Page, query = "") {
  const errors: string[] = []
  page.on("console", m => {
    if (m.type() === "error") errors.push(m.text())
  })
  page.on("pageerror", e => errors.push(e.message))
  await page.goto(`/${query}`)
  await expect(
    page.getByRole("heading", { name: "Aptitude Training", level: 1 })
  ).toBeVisible()
  return errors
}

export async function chooseTest(page: Page, name: string) {
  await page.getByRole("button", { name: new RegExp(`^${name}`) }).click()
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible()
}

/** From the instructions screen, skip the worked example and practice, then press Start. */
export async function skipToStart(page: Page) {
  await page
    .getByRole("button", { name: "Continue to the worked example" })
    .click()
  await page.getByRole("button", { name: "Skip practice" }).click()
  await page.getByRole("button", { name: "Start" }).click()
  await expect(page.getByText(/^Question 1 of \d+$/).first()).toBeVisible()
}

export async function startSprint(page: Page) {
  await chooseTest(page, "Mixed sprint")
  await skipToStart(page)
}

/**
 * Run axe on the element. axe itself applies inline styles while it measures
 * contrast, which the strict CSP reports; pass the error list to drop those.
 */
export async function axe(page: Page, errors?: string[]) {
  const before = errors?.length ?? 0
  const results = await new AxeBuilder({ page })
    .include("aptitude-training")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze()
  errors?.splice(before)
  expect(results.violations.map(v => `${v.id}: ${v.nodes[0]?.target}`)).toEqual(
    []
  )
}

export const counter = (page: Page) => page.locator(".at-count")
