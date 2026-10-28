import type { Navigation, OptionId } from "./types"

// The rules of a sitting as a pure state machine. Time comes in with each
// action, so tests can drive it with a fake clock.

export interface SessionState {
  status: "running" | "finished"
  endReason: "finished" | "time-up" | null
  index: number
  furthest: number
  answers: (OptionId | null)[]
  flags: boolean[]
  spentMs: number[]
  enteredAt: number
  startedAt: number
  finishedAt: number | null
}

export type SessionAction =
  | { type: "select"; option: OptionId }
  | { type: "next"; now: number }
  | { type: "back"; now: number }
  | { type: "goto"; index: number; now: number }
  | { type: "flag" }
  | { type: "expire"; now: number }
  | { type: "finish"; now: number }

export function startSession(count: number, now: number): SessionState {
  if (!Number.isInteger(count) || count < 1)
    throw new Error("A session needs at least one question")
  return {
    status: "running",
    endReason: null,
    index: 0,
    furthest: 0,
    answers: Array<OptionId | null>(count).fill(null),
    flags: Array<boolean>(count).fill(false),
    spentMs: Array<number>(count).fill(0),
    enteredAt: now,
    startedAt: now,
    finishedAt: null,
  }
}

type Handler<A extends SessionAction["type"]> = (
  state: SessionState,
  action: Extract<SessionAction, { type: A }>,
  oneWay: boolean
) => SessionState

const HANDLERS: { [A in SessionAction["type"]]: Handler<A> } = {
  select: (state, action) => {
    const answers = [...state.answers]
    answers[state.index] = action.option
    return { ...state, answers }
  },
  next: (state, action) => moveTo(state, state.index + 1, action.now),
  back: (state, action, oneWay) =>
    oneWay ? state : moveTo(state, state.index - 1, action.now),
  goto: (state, action, oneWay) =>
    oneWay ? state : moveTo(state, action.index, action.now),
  flag: (state, _action, oneWay) => {
    if (oneWay) return state
    const flags = [...state.flags]
    flags[state.index] = !flags[state.index]
    return { ...state, flags }
  },
  expire: (state, action) => end(state, "time-up", action.now),
  finish: (state, action) => end(state, "finished", action.now),
}

/**
 * One-way: you can change an answer until you leave the question, then it's
 * locked; no Back, no jumping, no flags. Free: move anywhere, flag anything.
 */
export function reduceSession(
  state: SessionState,
  action: SessionAction,
  navigation: Navigation
): SessionState {
  if (state.status === "finished") return state
  const handle = HANDLERS[action.type] as Handler<typeof action.type>
  return handle(state, action as never, navigation === "one-way")
}

function moveTo(
  state: SessionState,
  target: number,
  now: number
): SessionState {
  if (!Number.isInteger(target) || target < 0 || target >= state.answers.length)
    return state
  if (target === state.index) return state
  return {
    ...addTime(state, now),
    index: target,
    furthest: Math.max(state.furthest, target),
    enteredAt: now,
  }
}

function end(
  state: SessionState,
  reason: "finished" | "time-up",
  now: number
): SessionState {
  return {
    ...addTime(state, now),
    status: "finished",
    endReason: reason,
    finishedAt: now,
  }
}

function addTime(state: SessionState, now: number): SessionState {
  const spentMs = [...state.spentMs]
  spentMs[state.index] =
    (spentMs[state.index] ?? 0) + Math.max(0, now - state.enteredAt)
  return { ...state, spentMs }
}
