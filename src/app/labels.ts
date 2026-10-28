import type { Category } from "../domain/types"

export const CATEGORY_LABEL: Record<Category, string> = {
  verbal: "Verbal",
  maths: "Maths and logic",
  spatial: "Spatial",
}

export const LETTERS = ["A", "B", "C", "D", "E"] as const
