import type { KeyboardEvent } from "react"
import { reduceSession, type SessionAction } from "../../domain/session"
import type { OptionId } from "../../domain/types"
import type { Run } from "../run"
import { now } from "../useNow"
import { optionForKey, type PrimaryAction } from "./rules"

interface Input {
  run: Run
  onChange: (run: Run) => void
  onEnd: (run: Run) => void
  primary: PrimaryAction
  locked: boolean
  /** Free navigation with unanswered or flagged questions: confirm before finishing. */
  confirmFinish: boolean
  askToConfirm: () => void
}

/** Everything the test screen's buttons and answer keys do. */
export function testActions({
  run,
  onChange,
  onEnd,
  primary,
  locked,
  confirmFinish,
  askToConfirm,
}: Input) {
  const index = run.session.index
  const act = (action: SessionAction) => {
    const next = {
      ...run,
      session: reduceSession(run.session, action, run.settings.navigation),
    }
    if (next.session.status === "finished") onEnd(next)
    else onChange(next)
  }
  const choose = (option: OptionId) => {
    if (!locked) act({ type: "select", option })
  }
  const finish = () => act({ type: "finish", now: now() })
  const next = () => act({ type: "next", now: now() })
  const primaryActions: Record<PrimaryAction, () => void> = {
    check: () =>
      onChange({
        ...run,
        checked: run.checked.map((c, i) => c || i === index),
      }),
    finish: confirmFinish ? askToConfirm : finish,
    next,
    skip: next,
  }
  // Answer keys work only while focus is inside the test.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const option = optionForKey(
      e,
      run.paper.questions[index]?.optionOrder ?? []
    )
    if (!option) return
    e.preventDefault()
    choose(option)
  }
  return {
    choose,
    finish,
    onKeyDown,
    onPrimary: primaryActions[primary],
    back: () => act({ type: "back", now: now() }),
    flag: () => act({ type: "flag" }),
  }
}
