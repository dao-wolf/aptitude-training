import { describe, expect, it } from "vitest"
import { BANK } from "../../src/content/bank"
import { score } from "../../src/domain/scoring"
import { reduceSession, startSession } from "../../src/domain/session"
import {
  allowedSeconds,
  formatClock,
  remainingMs,
} from "../../src/domain/timing"
import type { Paper } from "../../src/domain/types"

describe("timing", () => {
  it.each([
    ["standard", 900],
    ["plus25", 1125],
    ["plus50", 1350],
    ["plus100", 1800],
    ["untimed", 0],
  ] as const)("%s preset on 15 minutes gives %i s", (preset, s) =>
    expect(allowedSeconds(900, preset)).toBe(s)
  )

  it("counts down and stops at zero", () => {
    expect(remainingMs(0, 0, 60)).toBe(60000)
    expect(remainingMs(59000, 0, 60)).toBe(1000)
    expect(remainingMs(70000, 0, 60)).toBe(0)
    expect(remainingMs(5, 0, 0)).toBe(Infinity)
  })

  it.each([
    [900000, "15:00"],
    [61000, "1:01"],
    [59001, "1:00"],
    [999, "0:01"],
    [0, "0:00"],
    [-5, "0:00"],
  ])("formats %i ms as %s", (ms, text) => expect(formatClock(ms)).toBe(text))
})

describe("score", () => {
  const paper: Paper = {
    specId: "t",
    seed: 1,
    questions: [
      { itemId: "m2", optionOrder: ["a", "b", "c", "d", "e"] }, // answer b
      { itemId: "v1", optionOrder: ["e", "d", "c", "b", "a"] }, // answer b
      { itemId: "s1", optionOrder: ["a", "b", "c", "d", "e"] }, // answer a
      { itemId: "m4", optionOrder: ["a", "b", "c", "d", "e"] },
    ],
  }
  const s0 = startSession(4, 0)
  const played = [
    { type: "select", option: "b" },
    { type: "next", now: 10000 },
    { type: "select", option: "a" },
    { type: "next", now: 16000 },
    { type: "finish", now: 18000 },
  ] as const
  const state = played.reduce((s, a) => reduceSession(s, a, "one-way"), s0)
  const summary = score(paper, BANK, state)

  it("marks by option id, whatever order they were shown in", () => {
    expect(summary.results.map(r => r.correct)).toEqual([
      true,
      false,
      false,
      false,
    ])
    expect(summary.correct).toBe(1)
  })
  it("counts answered, skipped, reached and percent", () => {
    expect(summary).toMatchObject({
      total: 4,
      answered: 2,
      skipped: 2,
      reached: 3,
      percent: 25,
    })
  })
  it("averages time over the questions reached only", () => {
    expect(summary.averageMs).toBe(6000)
  })
  it("breaks it down by category", () => {
    expect(summary.byCategory.maths).toEqual({
      total: 2,
      correct: 1,
      answered: 1,
      spentMs: 10000,
    })
    expect(summary.byCategory.verbal).toEqual({
      total: 1,
      correct: 0,
      answered: 1,
      spentMs: 6000,
    })
    expect(summary.byCategory.spatial).toEqual({
      total: 1,
      correct: 0,
      answered: 0,
      spentMs: 2000,
    })
  })
  it("handles an empty paper and refuses unknown questions", () => {
    expect(score({ ...paper, questions: [] }, BANK, s0)).toMatchObject({
      total: 0,
      percent: 0,
    })
    expect(() =>
      score(
        { ...paper, questions: [{ itemId: "zz", optionOrder: [] }] },
        BANK,
        s0
      )
    ).toThrow(/Unknown/)
  })
})
