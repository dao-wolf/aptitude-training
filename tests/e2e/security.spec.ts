import { expect, test } from "@playwright/test"
import { open, startSprint } from "./helpers"

// Hostile inputs: the address, browser storage and attributes are all outside our control.
test.describe("hostile input", () => {
  test("a script in the seed is ignored, never run or shown", async ({
    page,
  }) => {
    let dialog = false
    page.on("dialog", d => {
      dialog = true
      void d.dismiss()
    })
    const errors = await open(
      page,
      `?seed=${encodeURIComponent("<img src=x onerror=alert(1)>")}`
    )
    await startSprint(page)
    expect(dialog).toBe(false)
    expect(
      await page
        .locator("aptitude-training")
        .evaluate(el => el.shadowRoot?.innerHTML.includes("onerror"))
    ).toBe(false)
    expect(errors).toEqual([])
  })

  test("tampered storage is ignored and replaced with a clean list", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "aptitude-training:recent",
        '{"__proto__":{"polluted":true}}'
      )
    })
    const errors = await open(page)
    await startSprint(page)
    await page.getByRole("button", { name: "End test" }).click()
    await page.getByRole("button", { name: "Finish" }).click()
    const stored = await page.evaluate(() =>
      localStorage.getItem("aptitude-training:recent")
    )
    expect(JSON.parse(stored ?? "[]")).toHaveLength(50)
    expect(
      await page.evaluate(() => (({}) as Record<string, unknown>).polluted)
    ).toBeUndefined()
    expect(errors).toEqual([])
  })

  test("works with storage blocked", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("blocked")
        },
      })
    })
    const errors = await open(page)
    await startSprint(page)
    await page.getByRole("button", { name: "End test" }).click()
    await page.getByRole("button", { name: "Finish" }).click()
    await expect(
      page.getByRole("heading", { name: "Your result" })
    ).toBeVisible()
    expect(errors).toEqual([])
  })

  test("a hostile seed attribute is ignored", async ({ page }) => {
    await open(page)
    await page.evaluate(() => {
      const el = document.createElement("aptitude-training")
      el.setAttribute("seed", "javascript:alert(1)")
      el.id = "second"
      document.body.append(el)
    })
    await expect(
      page
        .locator("#second")
        .getByRole("heading", { name: "Aptitude Training" })
    ).toBeVisible()
  })

  test("sends nothing anywhere: no requests beyond its own files", async ({
    page,
  }) => {
    const requests: string[] = []
    page.on("request", r => requests.push(new URL(r.url()).pathname))
    await open(page)
    await startSprint(page)
    await page.getByRole("button", { name: "End test" }).click()
    await page.getByRole("button", { name: "Finish" }).click()
    expect(requests.every(p => p === "/" || p.startsWith("/dist/"))).toBe(true)
  })
})
