import { describe, expect, it } from "vitest"
import { BANK, METHODS } from "../../src/content/bank"
import { toNumber, validateBank } from "../../src/domain/schema"
import type { Item } from "../../src/domain/types"

const clone = <T>(v: T): T => structuredClone(v)
const textItem = () => clone(BANK.find(i => i.id === "m2") as Item)
const picItem = () => clone(BANK.find(i => i.id === "s1") as Item)
const check = (...items: unknown[]) => validateBank(items, METHODS)

describe("validateBank catches each broken rule", () => {
  const cases: [string, () => unknown[], RegExp][] = [
    ["duplicate id", () => [textItem(), textItem()], /id used 2 times/],
    ["answer not an option", () => [{ ...textItem(), answer: "z" }], /answer/],
    [
      "unknown method",
      () => [{ ...textItem(), method: "nope" }],
      /unknown method/,
    ],
    [
      "four options",
      () => {
        const i = textItem()
        i.options.pop()
        return [i]
      },
      /exactly a, b, c, d, e/,
    ],
    [
      "options out of order",
      () => {
        const i = textItem()
        i.options.reverse()
        return [i]
      },
      /exactly a, b, c, d, e/,
    ],
    [
      "two equal options",
      () => {
        const i = textItem()
        i.options[1] = { id: "b", text: "£52" }
        return [i]
      },
      /two options are the same/,
    ],
    [
      "same number written differently",
      () => {
        const i = textItem()
        i.options[1] = { id: "b", text: "52" }
        return [i]
      },
      /two options are the same/,
    ],
    [
      "picture option on a text item",
      () => {
        const i = textItem()
        i.options[0] = { id: "a", visual: { kind: "q" } }
        return [i]
      },
      /text only/,
    ],
    [
      "text option on a picture item",
      () => {
        const i = picItem()
        i.options[0] = { id: "a", text: "x" }
        return [i]
      },
      /picture only/,
    ],
    [
      "question mark as an option",
      () => {
        const i = picItem()
        i.options[0] = { id: "a", visual: { kind: "q" } }
        return [i]
      },
      /question mark/,
    ],
    [
      "stem on a text item",
      () => [{ ...textItem(), stem: [{ kind: "q" }] }],
      /stem/,
    ],
    [
      "ordered but not ascending",
      () => {
        const i = textItem()
        i.ordered = true
        i.options.reverse()
        i.options.forEach((o, k) => (o.id = "abcde"[k] as Item["answer"]))
        return [i]
      },
      /smallest to largest/,
    ],
    [
      "ordered but not numbers",
      () => [
        { ...clone(BANK.find(i => i.id === "v1") as Item), ordered: true },
      ],
      /must all be numbers/,
    ],
    [
      "ordered picture options",
      () => [{ ...picItem(), ordered: true }],
      /only text options/,
    ],
    [
      "missing enemy",
      () => [{ ...textItem(), enemies: ["ghost"] }],
      /doesn't exist/,
    ],
    [
      "one-sided enemy",
      () => [
        { ...textItem(), enemies: ["m4"] },
        clone(BANK.find(i => i.id === "m4") as Item),
      ],
      /doesn't list/,
    ],
    [
      "bad rotation",
      () => {
        const i = picItem()
        i.options[0] = {
          id: "a",
          visual: {
            kind: "fig",
            fig: "flag",
            rot: 30,
            flip: false,
            hollow: false,
          },
        }
        return [i]
      },
      /multiple of 45/,
    ],
    ["unknown field", () => [{ ...textItem(), extra: 1 }], /item 0/],
    ["not a list", () => "nope" as unknown as unknown[], /not a list/],
  ]
  it.each(cases)("%s", (_name, build, expected) => {
    const items = build()
    const problems = Array.isArray(items)
      ? check(...items)
      : validateBank(items, METHODS)
    expect(problems.join("\n")).toMatch(expected)
  })

  it("rejects a broken method list", () => {
    expect(validateBank(BANK, { x: { id: "x" } })[0]).toMatch(/methods/)
  })

  it("rejects a method stored under the wrong key", () => {
    const methods = { ...METHODS, percent: { ...METHODS.percent, id: "other" } }
    expect(validateBank([textItem()], methods).join()).toMatch(/different id/)
  })
})

describe("toNumber", () => {
  it.each([
    ["£54", 54],
    ["4 h", 4],
    ["12%", 12],
    ["1,200", 1200],
    ["-3.5", -3.5],
    ["Gallery", null],
  ])("%s → %s", (text, n) => expect(toNumber(text)).toBe(n))
})
