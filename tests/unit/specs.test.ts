import { describe, expect, it } from "vitest"
import { MIXED_SPRINT, drill } from "../../src/domain/specs"
import { CATEGORIES } from "../../src/domain/types"

describe("test modes", () => {
  it("the mixed sprint is 50 questions in 15 minutes, one way, marked at the end", () => {
    expect(MIXED_SPRINT).toMatchObject({
      seconds: 900,
      navigation: "one-way",
      feedback: "end",
    })
    expect(
      Object.values(MIXED_SPRINT.blueprint).reduce((a, b) => a + b, 0)
    ).toBe(50)
  })
  it("drills are 10 questions in 3 minutes with Back allowed, each with its own name", () => {
    const names = CATEGORIES.map(c => drill(c).name)
    for (const c of CATEGORIES) {
      expect(drill(c)).toMatchObject({
        seconds: 180,
        navigation: "free",
        feedback: "end",
        blueprint: { [c]: 10 },
      })
      expect(drill(c, "instant").feedback).toBe("instant")
    }
    expect(new Set(names).size).toBe(3)
    expect(names.every(n => n.endsWith("drill"))).toBe(true)
  })
})
