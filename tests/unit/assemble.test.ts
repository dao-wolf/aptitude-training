import { describe, expect, it } from "vitest"
import fc from "fast-check"
import { BANK } from "../../src/content/bank"
import { assemblePaper } from "../../src/domain/assemble"
import { mulberry32 } from "../../src/domain/rng"
import { MIXED_SPRINT, drill } from "../../src/domain/specs"
import type { Item } from "../../src/domain/types"

const byId = new Map(BANK.map(i => [i.id, i]))
const build = (seed: number, recent: string[] = [], spec = MIXED_SPRINT) =>
  assemblePaper({ spec, bank: BANK, seed, rng: mulberry32(seed), recent })

describe("assemblePaper", () => {
  it("same seed, same paper", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 32 - 1 }), seed => {
        expect(build(seed)).toEqual(build(seed))
      }),
      { numRuns: 30 }
    )
  })

  it("always 17 / 17 / 16, no repeats, every option shown once", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 32 - 1 }), seed => {
        const paper = build(seed)
        const items = paper.questions.map(q => byId.get(q.itemId) as Item)
        expect(paper.questions).toHaveLength(50)
        expect(new Set(paper.questions.map(q => q.itemId)).size).toBe(50)
        expect(items.filter(i => i.category === "verbal")).toHaveLength(17)
        expect(items.filter(i => i.category === "maths")).toHaveLength(17)
        expect(items.filter(i => i.category === "spatial")).toHaveLength(16)
        for (const q of paper.questions)
          expect([...q.optionOrder].sort()).toEqual(["a", "b", "c", "d", "e"])
      }),
      { numRuns: 30 }
    )
  })

  it("keeps enemies apart", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 32 - 1 }), seed => {
        const ids = new Set(build(seed).questions.map(q => q.itemId))
        expect(ids.has("v2") && ids.has("v17")).toBe(false)
      }),
      { numRuns: 60 }
    )
  })

  it("keeps ordered options in order and shuffles the rest", () => {
    const paper = build(7)
    for (const q of paper.questions) {
      if (byId.get(q.itemId)?.ordered)
        expect(q.optionOrder).toEqual(["a", "b", "c", "d", "e"])
    }
    expect(paper.questions.some(q => q.optionOrder.join("") !== "abcde")).toBe(
      true
    )
  })

  it("mixes the categories rather than grouping them", () => {
    const cats = build(3).questions.map(q => byId.get(q.itemId)?.category)
    expect(cats.slice(0, 17).every(c => c === cats[0])).toBe(false)
  })

  it("puts unseen questions first, then the longest ago", () => {
    const verbal = BANK.filter(i => i.category === "verbal").map(i => i.id)
    const recent = verbal.slice(0, 20) // 20 seen, oldest first; 5 unseen
    const picked = build(11, recent)
      .questions.map(q => q.itemId)
      .filter(id => id.startsWith("v"))
    for (const unseen of verbal.slice(20)) expect(picked).toContain(unseen)
    for (const newest of recent.slice(-3)) expect(picked).not.toContain(newest)
  })

  it("builds a drill from one category", () => {
    const paper = build(5, [], drill("spatial"))
    expect(paper.questions).toHaveLength(10)
    expect(
      paper.questions.every(q => byId.get(q.itemId)?.category === "spatial")
    ).toBe(true)
    expect(paper.specId).toBe("drill-spatial")
  })

  it("refuses a blueprint the bank can't fill", () => {
    const greedy = { ...MIXED_SPRINT, blueprint: { verbal: 99 } }
    expect(() => build(1, [], greedy)).toThrow(/Not enough verbal/)
  })
})

describe("left off every paper", () => {
  const variants: [string, (item: Item) => Item][] = [
    ["a question that isn't live", item => ({ ...item, status: "draft" })],
    ["a practice question", item => ({ ...item, practice: true })],
  ]
  it.each(variants)("%s", (_name, change) => {
    const bank = BANK.map(i => (i.id === "s1" ? change(i) : i))
    fc.assert(
      fc.property(fc.integer(), seed => {
        const p = assemblePaper({
          spec: drill("spatial"),
          bank,
          seed,
          rng: mulberry32(seed),
        })
        expect(p.questions.map(q => q.itemId)).not.toContain("s1")
      }),
      { numRuns: 20 }
    )
  })
})
