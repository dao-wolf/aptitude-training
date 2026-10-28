import { describe, expect, it } from "vitest"
import fc from "fast-check"
import {
  reduceSession,
  startSession,
  type SessionAction,
  type SessionState,
} from "../../src/domain/session"
import type { Navigation } from "../../src/domain/types"

const run = (nav: Navigation, actions: SessionAction[], count = 3) =>
  actions.reduce((s, a) => reduceSession(s, a, nav), startSession(count, 0))

describe("session: one-way", () => {
  it("an answer can change until you leave, then it's locked", () => {
    const s = run("one-way", [
      { type: "select", option: "a" },
      { type: "select", option: "c" },
      { type: "next", now: 1000 },
      { type: "back", now: 2000 },
      { type: "select", option: "e" },
    ])
    expect(s.answers).toEqual(["c", "e", null])
    expect(s.index).toBe(1)
  })
  it("Next with no answer is a skip, and you can't return", () => {
    const s = run("one-way", [
      { type: "next", now: 1 },
      { type: "goto", index: 0, now: 2 },
    ])
    expect(s.answers[0]).toBeNull()
    expect(s.index).toBe(1)
  })
  it("has no flags", () => {
    expect(run("one-way", [{ type: "flag" }]).flags).toEqual([
      false,
      false,
      false,
    ])
  })
})

describe("session: free", () => {
  it("moves back, jumps and flags", () => {
    const s = run("free", [
      { type: "next", now: 1 },
      { type: "next", now: 2 },
      { type: "back", now: 3 },
      { type: "flag" },
      { type: "goto", index: 0, now: 4 },
      { type: "select", option: "b" },
    ])
    expect(s.index).toBe(0)
    expect(s.flags).toEqual([false, true, false])
    expect(s.answers[0]).toBe("b")
    expect(s.furthest).toBe(2)
  })
  it("flag toggles off again", () => {
    expect(run("free", [{ type: "flag" }, { type: "flag" }]).flags[0]).toBe(
      false
    )
  })
  it("ignores moves off either end and bad targets", () => {
    for (const a of [
      { type: "back", now: 1 },
      { type: "goto", index: -1, now: 1 },
      { type: "goto", index: 3, now: 1 },
      { type: "goto", index: 1.5, now: 1 },
      { type: "goto", index: 0, now: 1 },
    ] as SessionAction[]) {
      expect(run("free", [a])).toEqual(startSession(3, 0))
    }
    const last = run("free", [
      { type: "goto", index: 2, now: 1 },
      { type: "next", now: 2 },
    ])
    expect(last.index).toBe(2)
  })
})

describe("session: time and ending", () => {
  it("adds time to the question you were on", () => {
    const s = run("free", [
      { type: "next", now: 4000 },
      { type: "back", now: 5000 },
      { type: "finish", now: 7000 },
    ])
    expect(s.spentMs).toEqual([6000, 1000, 0])
  })
  it("never counts negative time", () => {
    expect(run("free", [{ type: "next", now: -50 }]).spentMs[0]).toBe(0)
  })
  it("time-up ends it and nothing changes afterwards", () => {
    const s = run("free", [
      { type: "expire", now: 900 },
      { type: "select", option: "a" },
      { type: "next", now: 901 },
    ])
    expect(s.status).toBe("finished")
    expect(s.endReason).toBe("time-up")
    expect(s.finishedAt).toBe(900)
    expect(s.answers[0]).toBeNull()
    expect(s.index).toBe(0)
  })
  it("finish records the reason", () => {
    expect(run("one-way", [{ type: "finish", now: 10 }]).endReason).toBe(
      "finished"
    )
  })
  it("needs at least one question", () => {
    expect(() => startSession(0, 0)).toThrow()
    expect(() => startSession(2.5, 0)).toThrow()
  })
})

describe("session: properties", () => {
  const action = fc.oneof(
    fc.record({
      type: fc.constant("select" as const),
      option: fc.constantFrom("a" as const, "b" as const, "c" as const),
    }),
    fc.record({
      type: fc.constantFrom(
        "next" as const,
        "back" as const,
        "finish" as const,
        "expire" as const
      ),
      now: fc.nat(100000),
    }),
    fc.record({
      type: fc.constant("goto" as const),
      index: fc.integer({ min: -2, max: 8 }),
      now: fc.nat(100000),
    }),
    fc.record({ type: fc.constant("flag" as const) })
  ) as fc.Arbitrary<SessionAction>

  it("one-way never goes backwards and never edits a question it left", () => {
    fc.assert(
      fc.property(fc.array(action, { maxLength: 40 }), actions => {
        let s: SessionState = startSession(6, 0)
        for (const a of actions) {
          const next = reduceSession(s, a, "one-way")
          expect(next.index).toBeGreaterThanOrEqual(s.index)
          for (let i = 0; i < s.index; i++)
            expect(next.answers[i]).toBe(s.answers[i])
          s = next
        }
      })
    )
  })

  it("stays in range, and once finished stays finished", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Navigation>("one-way", "free"),
        fc.array(action, { maxLength: 40 }),
        (nav, actions) => {
          let s = startSession(6, 0)
          let finished = false
          for (const a of actions) {
            const before = s
            s = reduceSession(s, a, nav)
            expect(s.index).toBeGreaterThanOrEqual(0)
            expect(s.index).toBeLessThan(6)
            expect(s.furthest).toBeGreaterThanOrEqual(s.index)
            if (finished) expect(s).toBe(before)
            if (s.status === "finished") finished = true
          }
        }
      )
    )
  })
})
