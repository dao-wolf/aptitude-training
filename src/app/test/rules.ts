import { formatClock } from "../../domain/timing"
import type { OptionId } from "../../domain/types"

// The test screen's decisions, as small pure functions.

const KEY_TO_POSITION: Record<string, number> = {
  a: 0,
  b: 1,
  c: 2,
  d: 3,
  e: 4,
  "1": 0,
  "2": 1,
  "3": 2,
  "4": 3,
  "5": 4,
}

interface KeyPress {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  repeat: boolean
}

/** The option a key picks (A–E or 1–5, by position on screen), or undefined. Never with Cmd, Ctrl or Alt. */
export function optionForKey(
  press: KeyPress,
  order: readonly OptionId[]
): OptionId | undefined {
  if (press.metaKey || press.ctrlKey || press.altKey || press.repeat)
    return undefined
  const pos = KEY_TO_POSITION[press.key.toLowerCase()]
  return pos === undefined ? undefined : order[pos]
}

export type PrimaryAction = "check" | "finish" | "next" | "skip"

interface PrimaryInput {
  learn: boolean
  checked: boolean
  last: boolean
  answered: boolean
  oneWay: boolean
}

/** What the main button does: check an answer (learn mode), finish, move on, or skip. */
export function primaryAction({
  learn,
  checked,
  last,
  answered,
  oneWay,
}: PrimaryInput): PrimaryAction {
  if (learn && !checked) return "check"
  if (last) return "finish"
  return !answered && oneWay ? "skip" : "next"
}

/** The clock: time left, or time taken when there's no limit. */
export function clockText(
  timed: boolean,
  remainingMs: number,
  elapsedMs: number
): string {
  return timed
    ? formatClock(remainingMs)
    : `No clock · ${formatClock(elapsedMs)}`
}

/** The spoken warning for the time left: changes only at 5 minutes and 1 minute. */
export function timeWarning(
  timed: boolean,
  remainingMs: number,
  limitSeconds: number
): string {
  if (!timed) return ""
  if (remainingMs <= 60_000) return "1 minute left"
  if (remainingMs <= 300_000 && limitSeconds > 300) return "5 minutes left"
  return ""
}

interface RunView {
  answers: readonly (OptionId | null)[]
  flags: readonly boolean[]
  checked: readonly boolean[]
  index: number
  free: boolean
  learn: boolean
}

/** Everything the test screen shows about the current question, worked out once. */
export function viewOf({
  answers,
  flags,
  checked,
  index,
  free,
  learn,
}: RunView) {
  const chosen = answers[index] ?? null
  const isChecked = checked[index] ?? false
  const last = index === answers.length - 1
  const primary = primaryAction({
    learn,
    checked: isChecked,
    last,
    answered: chosen !== null,
    oneWay: !free,
  })
  return {
    chosen,
    last,
    locked: learn && isChecked,
    primary,
    /** Check stays disabled until an answer is picked. */
    primaryDisabled: primary === "check" && chosen === null,
    unanswered: answers.filter(a => a === null).length,
    flaggedCount: flags.filter(Boolean).length,
    flagged: flags[index] ?? false,
  }
}
