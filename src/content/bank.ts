import verbal from "../../content/questions/verbal.json"
import maths from "../../content/questions/maths.json"
import spatial from "../../content/questions/spatial.json"
import practice from "../../content/questions/practice.json"
import methods from "../../content/methods.json"
import type { Category, Item, Method } from "../domain/types"

// The bank is checked against the schema in CI (tests/unit/bank.test.ts), so
// the browser trusts it as typed data.
export const BANK = [...verbal, ...maths, ...spatial] as Item[]
export const PRACTICE = practice as Item[]
export const METHODS = methods as Record<string, Method>

/** Worked example first, then practice questions, for one category. */
export function practiceFor(category: Category): Item[] {
  return PRACTICE.filter(item => item.category === category)
}
