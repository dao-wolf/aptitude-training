// The shapes everything else agrees on. Pure data: no React, no browser.

export type Category = "verbal" | "maths" | "spatial"
export const CATEGORIES: readonly Category[] = ["verbal", "maths", "spatial"]

export type OptionId = "a" | "b" | "c" | "d" | "e"

export type FigureName =
  "flag" | "ell" | "tee" | "notch" | "arrowTab" | "stairs"

export type Visual =
  | {
      kind: "fig"
      fig: FigureName
      rot: number
      flip: boolean
      hollow: boolean
    }
  | { kind: "grid"; cells: number[] }
  | { kind: "poly"; sides: number }
  | { kind: "dots"; n: number }
  | { kind: "sym"; v: string }
  | { kind: "q" }

export interface Option {
  id: OptionId
  text?: string
  visual?: Visual
}

export interface Row {
  label: string
  cells: string[]
}

export interface Explanation {
  why: string
  rows: Row[]
  steps: string[]
  trap?: string
}

export type ItemStatus =
  "draft" | "screened" | "blind-solved" | "reviewed" | "live" | "retired"

export interface Item {
  id: string
  category: Category
  method: string
  kind: "text" | "visual"
  prompt: string
  stem?: Visual[]
  options: Option[]
  answer: OptionId
  ordered?: boolean
  enemies?: string[]
  explanation: Explanation
  status: ItemStatus
  provenance: { origin: "original"; writtenBy: string; created: string }
}

export interface Method {
  id: string
  name: string
  method: string[]
  trick?: string[]
  example?: string
}

export type Navigation = "one-way" | "free"
export type Feedback = "end" | "instant"

/** A practice mode, as data. The runner reads this; it never hard-codes a mode. */
export interface TestSpec {
  id: string
  name: string
  blueprint: Partial<Record<Category, number>>
  seconds: number
  navigation: Navigation
  feedback: Feedback
}

/** One question on a paper: which item, and the order its options are shown in. */
export interface PaperQuestion {
  itemId: string
  optionOrder: OptionId[]
}

export interface Paper {
  specId: string
  seed: number
  questions: PaperQuestion[]
}
