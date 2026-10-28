import { describe, expect, it } from "vitest"
import fc from "fast-check"
import { RECENT_CAP, parseRecent, updateRecent } from "../../src/domain/recent"

describe("parseRecent (tampered browser storage)", () => {
  it.each([
    [null, []],
    [undefined, []],
    ["", []],
    ["not json", []],
    ["{}", []],
    ['{"a":1}', []],
    ["42", []],
    ['["v1","m2"]', ["v1", "m2"]],
    ['["v1",1,null,{"x":1},"m2"]', ["v1", "m2"]],
    ['["__proto__","<img src=x>","V1","v1"]', ["v1"]],
    ['["v1","v1","m2"]', ["v1", "m2"]],
  ])("%j → %j", (raw, ids) => expect(parseRecent(raw as string)).toEqual(ids))

  it("rejects oversized data and caps long lists", () => {
    expect(parseRecent("x".repeat(20001))).toEqual([])
    const many = JSON.stringify(Array.from({ length: 300 }, (_, i) => `q${i}`))
    const parsed = parseRecent(many)
    expect(parsed).toHaveLength(RECENT_CAP)
    expect(parsed.at(-1)).toBe("q299")
  })

  it("never throws", () => {
    fc.assert(
      fc.property(fc.string(), s => {
        expect(Array.isArray(parseRecent(s))).toBe(true)
      })
    )
    fc.assert(
      fc.property(fc.json(), s => {
        expect(Array.isArray(parseRecent(s))).toBe(true)
      })
    )
  })
})

describe("updateRecent", () => {
  it("moves seen ids to the newest end", () => {
    expect(updateRecent(["a", "b", "c"], ["b", "d"])).toEqual([
      "a",
      "c",
      "b",
      "d",
    ])
  })
  it("stays capped and keeps the newest", () => {
    const old = Array.from({ length: RECENT_CAP }, (_, i) => `q${i}`)
    const out = updateRecent(old, ["new"])
    expect(out).toHaveLength(RECENT_CAP)
    expect(out.at(-1)).toBe("new")
    expect(out[0]).toBe("q1")
  })
})
