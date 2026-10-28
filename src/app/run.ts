import { assemblePaper } from "../domain/assemble"
import { mulberry32 } from "../domain/rng"
import { startSession, type SessionState } from "../domain/session"
import { allowedSeconds, type TimePresetId } from "../domain/timing"
import type {
  Category,
  Feedback,
  Item,
  Navigation,
  Paper,
  TestSpec,
} from "../domain/types"
import { BANK } from "../content/bank"
import { loadRecent } from "./storage"

export interface Settings {
  preset: TimePresetId
  feedback: Feedback
  navigation: Navigation
}

/** One sitting: the paper, the questions in paper order, and the session state. */
export interface Run {
  spec: TestSpec
  settings: Settings
  limitSeconds: number
  paper: Paper
  items: Item[]
  session: SessionState
  /** Learn mode: questions whose answer has been checked. */
  checked: boolean[]
}

export const defaultSettings = (spec: TestSpec): Settings => ({
  preset: "standard",
  feedback: spec.feedback,
  navigation: spec.navigation,
})

export function newSeed(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] ?? 1
}

export function startRun(
  spec: TestSpec,
  settings: Settings,
  seed: number,
  at: number
): Run {
  const paper = assemblePaper({
    spec,
    bank: BANK,
    seed,
    rng: mulberry32(seed),
    recent: loadRecent(),
  })
  const byId = new Map(BANK.map(i => [i.id, i]))
  const items = paper.questions.map(q => byId.get(q.itemId) as Item)
  return {
    spec,
    settings,
    limitSeconds: allowedSeconds(spec.seconds, settings.preset),
    paper,
    items,
    session: startSession(items.length, at),
    checked: items.map(() => false),
  }
}

export const specCategories = (spec: TestSpec): Category[] =>
  Object.keys(spec.blueprint) as Category[]
export const questionCount = (spec: TestSpec): number =>
  Object.values(spec.blueprint).reduce((sum, n) => sum + (n ?? 0), 0)
