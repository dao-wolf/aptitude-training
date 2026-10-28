import { expect, test } from "@playwright/test"
import {
  axe,
  chooseTest,
  counter,
  open,
  skipToStart,
  startSprint,
} from "./helpers"

test.describe("starting a test", () => {
  test("landing → instructions → worked example → practice → ready → question 1", async ({
    page,
  }) => {
    const errors = await open(page)
    await axe(page, errors)
    await chooseTest(page, "Mixed sprint")
    await expect(page.getByText("50 questions")).toBeVisible()
    await expect(page.getByText("15:00").first()).toBeVisible()
    await expect(page.getByText(/can't go back/)).toBeVisible()
    await axe(page, errors)

    await page
      .getByRole("button", { name: "Continue to the worked example" })
      .click()
    await expect(page.getByText(/Worked example · not scored/)).toBeVisible()
    await expect(page.getByText("✓ Your answer, correct")).toBeVisible()
    await axe(page, errors)
    await page.getByRole("button", { name: "Next practice question" }).click()

    await expect(page.getByText(/Practice 1 of 2/)).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Check answer" })
    ).toBeDisabled()
    await page.getByRole("radio").first().check()
    await page.getByRole("button", { name: "Check answer" }).click()
    await expect(page.getByRole("status")).toBeVisible()
    await expect(
      page.getByRole("region", { name: "How to solve it" })
    ).toBeVisible()
    await page.getByRole("button", { name: "Next practice question" }).click()
    await page.getByRole("radio").first().check()
    await page.getByRole("button", { name: "Check answer" }).click()
    await page.getByRole("button", { name: "I'm ready" }).click()

    await expect(page.getByRole("heading", { name: "Ready?" })).toBeFocused()
    await page.getByRole("button", { name: "Start" }).click()
    await expect(counter(page)).toHaveText("Question 1 of 50")
    await expect(page.getByLabel("Time left")).toHaveText("15:00")
    await axe(page, errors)
    expect(errors).toEqual([])
  })

  test("time presets change the clock", async ({ page }) => {
    await open(page)
    await chooseTest(page, "Mixed sprint")
    await page.getByText("Options").click()
    await page.getByRole("radio", { name: /\+50%/ }).check()
    await expect(page.getByText("22:30").first()).toBeVisible()
    await skipToStart(page)
    await expect(page.getByLabel("Time left")).toHaveText("22:30")
  })

  test("no clock counts up instead", async ({ page }) => {
    await open(page)
    await chooseTest(page, "Mixed sprint")
    await page.getByText("Options").click()
    await page.getByRole("radio", { name: "No clock" }).check()
    await skipToStart(page)
    await expect(page.getByLabel("Time taken")).toContainText("No clock")
  })
})

test.describe("answering", () => {
  test("Enter on Next moves exactly one question", async ({ page }) => {
    await open(page)
    await startSprint(page)
    await page.getByRole("radio").first().check()
    await page.getByRole("button", { name: "Next" }).focus()
    await page.keyboard.press("Enter")
    await expect(counter(page)).toHaveText("Question 2 of 50")
    await page.keyboard.press("Enter") // focus moved to the question, so Enter does nothing
    await expect(counter(page)).toHaveText("Question 2 of 50")
  })

  test("letter keys answer; Cmd or Ctrl shortcuts don't", async ({ page }) => {
    await open(page)
    await startSprint(page)
    await page.keyboard.press("c")
    await expect(page.getByRole("radio").nth(2)).toBeChecked()
    await page.keyboard.press("2")
    await expect(page.getByRole("radio").nth(1)).toBeChecked()
    await page.keyboard.press("ControlOrMeta+a")
    await page.keyboard.press("ControlOrMeta+c")
    await expect(page.getByRole("radio").nth(1)).toBeChecked()
  })

  test("keys typed on the host page don't answer questions", async ({
    page,
  }) => {
    await open(page)
    await startSprint(page)
    await page.evaluate(() => {
      const input = document.createElement("input")
      input.setAttribute("aria-label", "Site search")
      document.body.prepend(input)
    })
    await page.getByLabel("Site search").fill("abcde")
    for (const radio of await page.getByRole("radio").all())
      await expect(radio).not.toBeChecked()
  })

  test("one-way: change your mind, then it's locked; Skip moves on", async ({
    page,
  }) => {
    await open(page)
    await startSprint(page)
    await expect(page.getByRole("button", { name: "Back" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Skip" })).toBeVisible()
    await page.getByRole("radio").nth(0).check()
    await page.getByRole("radio").nth(3).check()
    await expect(page.getByRole("radio").nth(3)).toBeChecked()
    await page.getByRole("button", { name: "Next" }).click()
    await page.getByRole("button", { name: "Skip" }).click()
    await expect(counter(page)).toHaveText("Question 3 of 50")
  })

  test("each new question takes focus and is announced", async ({ page }) => {
    await open(page)
    await startSprint(page)
    await page.getByRole("button", { name: "Skip" }).click()
    await expect(page.locator(".at-prompt")).toBeFocused()
    await expect(page.locator("[aria-live=polite]")).toHaveText(
      "Question 2 of 50"
    )
  })
})

test.describe("ending", () => {
  test("time up keeps your answers and shows the result", async ({ page }) => {
    await page.clock.install()
    await open(page)
    await startSprint(page)
    await page.getByRole("radio").first().check()
    await page.clock.fastForward("10:30")
    await expect(page.locator("[aria-live=assertive]")).toHaveText(
      "5 minutes left"
    )
    await page.clock.fastForward("04:30")
    await expect(page.getByRole("heading", { name: "Time's up" })).toBeFocused()
    await axe(page)
    await page.getByRole("button", { name: "See your result" }).click()
    await expect(page.getByText("Time ran out.")).toBeVisible()
    await expect(
      page.getByText("Answered", { exact: true }).locator("+ dd")
    ).toHaveText("1")
  })

  test("finish early, read the result, review an answer", async ({ page }) => {
    await open(page)
    await startSprint(page)
    await page.getByRole("radio").first().check()
    await page.getByRole("button", { name: "Next" }).click()
    await page.getByRole("button", { name: "End test" }).click()
    await page.getByRole("button", { name: "Finish" }).click()
    await expect(
      page.getByRole("heading", { name: "Your result" })
    ).toBeFocused()
    await expect(page.getByText(/of 50 correct/)).toBeVisible()
    await expect(page.getByRole("table", { name: "By section" })).toBeVisible()
    await expect(page.getByText(/no pass mark or percentile/)).toBeVisible()
    await axe(page)
    await page
      .getByRole("button", { name: /^Question 1: (right|wrong)$/ })
      .click()
    await expect(page.getByRole("heading", { name: "Review" })).toBeVisible()
    await expect(
      page.getByText(/✓ (Correct answer|Your answer, correct)/)
    ).toBeVisible()
    await expect(
      page.getByRole("region", { name: "How to solve it" })
    ).toBeVisible()
    await axe(page)
    await page.getByRole("radio", { name: "Unanswered" }).check()
    await expect(page.getByText(/· unanswered/)).toBeVisible()
  })
})

test.describe("drills", () => {
  test("Back, Flag and the finish check", async ({ page }) => {
    await open(page)
    await chooseTest(page, "Maths and logic drill")
    await expect(page.getByText(/You can go back/)).toBeVisible()
    await skipToStart(page)
    await expect(counter(page)).toHaveText("Question 1 of 10")
    await page.getByRole("button", { name: "Flag" }).click()
    await expect(page.getByRole("button", { name: "Flagged" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    await page.getByRole("button", { name: "Next" }).click()
    await page.getByRole("button", { name: "Back" }).click()
    await expect(counter(page)).toHaveText("Question 1 of 10")
    await page.getByRole("button", { name: "End test" }).click()
    await expect(page.getByRole("alertdialog")).toContainText(
      "10 unanswered questions and 1 flagged"
    )
    await page.getByRole("button", { name: "Keep going" }).click()
    await expect(counter(page)).toHaveText("Question 1 of 10")
  })

  test("learn mode shows the explanation after checking", async ({ page }) => {
    await open(page)
    await chooseTest(page, "Verbal drill")
    await page.getByText("Options").click()
    await page.getByRole("radio", { name: /Learn/ }).check()
    await skipToStart(page)
    await page.getByRole("radio").first().check()
    await page.getByRole("button", { name: "Check answer" }).click()
    await expect(
      page.getByRole("region", { name: "How to solve it" })
    ).toBeVisible()
    await expect(page.getByRole("radio").first()).toBeDisabled()
    await page.getByRole("button", { name: "Next" }).click()
    await expect(counter(page)).toHaveText("Question 2 of 10")
  })
})

test.describe("papers", () => {
  test("the same seed gives the same paper", async ({ page }) => {
    await open(page, "?seed=abc123")
    await startSprint(page)
    const first = await page.locator(".at-prompt").textContent()
    await open(page, "?seed=abc123")
    await startSprint(page)
    await expect(page.locator(".at-prompt")).toHaveText(first ?? "")
  })

  test("works on a phone-sized screen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 740 })
    await open(page)
    await startSprint(page)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    )
    expect(overflow).toBe(false)
    await axe(page)
  })
})
