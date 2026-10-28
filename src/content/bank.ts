import verbal from "../../content/questions/verbal.json"
import maths from "../../content/questions/maths.json"
import spatial from "../../content/questions/spatial.json"
import methods from "../../content/methods.json"
import type { Item, Method } from "../domain/types"

// The bank is checked against the schema in CI (tests/unit/bank.test.ts), so
// the browser trusts it as typed data.
export const BANK = [...verbal, ...maths, ...spatial] as Item[]
export const METHODS = methods as Record<string, Method>
