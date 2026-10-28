import { describe, expect, it } from "vitest"
import { BANK, METHODS } from "../../src/content/bank"
import { validateBank } from "../../src/domain/schema"
import { MIXED_SPRINT, drill } from "../../src/domain/specs"
import { CATEGORIES } from "../../src/domain/types"

// bank:check: the real question bank must pass every rule before it ships.
describe("question bank", () => {
  it("passes every schema and consistency rule", () => {
    expect(validateBank(BANK, METHODS)).toEqual([])
  })

  it("has enough live questions for every mode", () => {
    for (const spec of [MIXED_SPRINT, ...CATEGORIES.map(c => drill(c))]) {
      for (const [category, need] of Object.entries(spec.blueprint)) {
        const have = BANK.filter(
          i => i.category === category && i.status === "live"
        ).length
        expect(have, `${spec.id} ${category}`).toBeGreaterThanOrEqual(need)
      }
    }
  })

  it("has no publisher names anywhere", () => {
    const text = JSON.stringify([BANK, METHODS]).toLowerCase()
    for (const name of [
      "ccat",
      "criteria",
      "shl",
      "saville",
      "kenexa",
      "talogy",
    ]) {
      expect(text.includes(name), name).toBe(false)
    }
  })
})
