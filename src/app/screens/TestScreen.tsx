import { useEffect, useRef, useState } from "react"
import { reduceSession } from "../../domain/session"
import { remainingMs } from "../../domain/timing"
import { METHODS } from "../../content/bank"
import { Explanation } from "../Explanation"
import { QuestionView } from "../QuestionView"
import type { Run } from "../run"
import { clockText, timeWarning, viewOf } from "../test/rules"
import { FinishConfirm, TestFooter, TestHeader } from "../test/TestParts"
import { testActions } from "../test/testActions"
import { now, useNow } from "../useNow"

interface Props {
  run: Run
  onChange: (run: Run) => void
  onEnd: (run: Run) => void
}

/** The clock for a run: time left, and the sitting ends itself when it runs out. */
function useRunClock(run: Run, onEnd: (run: Run) => void) {
  const t = useNow(run.session.status === "running")
  const timed = run.limitSeconds > 0
  const remaining = remainingMs(t, run.session.startedAt, run.limitSeconds)
  const expired = timed && remaining <= 0
  useEffect(() => {
    if (expired)
      onEnd({
        ...run,
        session: reduceSession(
          run.session,
          { type: "expire", now: now() },
          run.settings.navigation
        ),
      })
  }, [expired, run, onEnd])
  return { timed, remaining, elapsed: Math.max(0, t - run.session.startedAt) }
}

export function TestScreen({ run, onChange, onEnd }: Props) {
  const { session, items, paper, settings } = run
  const index = session.index
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [confirming, setConfirming] = useState(false)
  const { timed, remaining, elapsed } = useRunClock(run, onEnd)
  const free = settings.navigation === "free"
  const view = viewOf({
    answers: session.answers,
    flags: session.flags,
    checked: run.checked,
    index,
    free,
    learn: settings.feedback === "instant",
  })
  const actions = testActions({
    run,
    onChange,
    onEnd,
    primary: view.primary,
    locked: view.locked,
    confirmFinish: free && view.unanswered + view.flaggedCount > 0,
    askToConfirm: () => setConfirming(true),
  })

  // Move focus to each new question, so screen readers start reading it.
  useEffect(() => headingRef.current?.focus(), [index])

  const item = items[index]
  const question = paper.questions[index]
  if (!item || !question) return null

  return (
    <div className="at-test" onKeyDown={actions.onKeyDown}>
      <TestHeader
        category={item.category}
        index={index}
        total={items.length}
        clock={clockText(timed, remaining, elapsed)}
        timed={timed}
        lowTime={timed && remaining <= 60_000}
      />
      <p className="at-sr" aria-live="polite">
        Question {index + 1} of {items.length}
      </p>
      <p className="at-sr" aria-live="assertive">
        {timeWarning(timed, remaining, run.limitSeconds)}
      </p>
      <QuestionView
        key={index}
        item={item}
        optionOrder={question.optionOrder}
        chosen={view.chosen}
        {...(view.locked ? {} : { onChoose: actions.choose })}
        reveal={view.locked}
        headingRef={headingRef}
      />
      {view.locked && <Explanation item={item} method={METHODS[item.method]} />}
      {confirming ? (
        <FinishConfirm
          unanswered={view.unanswered}
          flagged={view.flaggedCount}
          onFinish={actions.finish}
          onCancel={() => setConfirming(false)}
        />
      ) : (
        <TestFooter
          free={free}
          first={index === 0}
          last={view.last}
          flagged={view.flagged}
          primary={view.primary}
          primaryDisabled={view.primary === "check" && !view.chosen}
          onPrimary={actions.onPrimary}
          onBack={actions.back}
          onFlag={actions.flag}
          onEnd={() => setConfirming(true)}
        />
      )}
    </div>
  )
}
