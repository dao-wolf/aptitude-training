import { describe, expect, it } from "vitest"
import fc from "fast-check"
import { mulberry32, shuffle } from "../../src/domain/rng"
import { formatSeed, parseSeed } from "../../src/domain/seed"

describe("mulberry32", () => {
  it("stays in [0, 1)", () => {
    fc.assert(
      fc.property(fc.integer(), seed => {
        const r = mulberry32(seed)
        for (let i = 0; i < 50; i++) {
          const x = r()
          expect(x).toBeGreaterThanOrEqual(0)
          expect(x).toBeLessThan(1)
        }
      })
    )
  })
})

describe("shuffle", () => {
  it("keeps every element and leaves the input alone", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), fc.integer(), (xs, seed) => {
        const copy = [...xs]
        const out = shuffle(xs, mulberry32(seed))
        expect(xs).toEqual(copy)
        expect([...out].sort((a, b) => a - b)).toEqual(
          [...xs].sort((a, b) => a - b)
        )
      })
    )
  })
  it("actually reorders", () => {
    expect(shuffle([1, 2, 3, 4, 5, 6, 7, 8], mulberry32(1))).not.toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ])
  })
})

describe("parseSeed (hostile input from the address bar)", () => {
  it("accepts short letters and digits, round-trips through formatSeed", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 32 - 1 }), n => {
        expect(parseSeed(formatSeed(n))).toBe(n)
      })
    )
  })
  it.each(["<script>alert(1)</script>", "a".repeat(13), "__proto__"])(
    "rejects %j",
    input => expect(parseSeed(input as string)).toBeNull()
  )
  it("never throws on any string", () => {
    fc.assert(
      fc.property(fc.string(), s => {
        const r = parseSeed(s)
        expect(r === null || Number.isSafeInteger(r)).toBe(true)
      })
    )
  })
})

describe("pinned outputs (a changed algorithm changes every saved seed)", () => {
  it("mulberry32(42) and shuffle stay the same", () => {
    const r = mulberry32(42)
    expect([r(), r(), r()].map(x => x.toFixed(10))).toMatchInlineSnapshot(`
      [
        "0.6011037519",
        "0.4482905590",
        "0.8524657935",
      ]
    `)
    expect(shuffle([1, 2, 3, 4, 5, 6, 7, 8], mulberry32(1)))
      .toMatchInlineSnapshot(`
      [
        3,
        2,
        7,
        8,
        5,
        4,
        1,
        6,
      ]
    `)
  })
})
