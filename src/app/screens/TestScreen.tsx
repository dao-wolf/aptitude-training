import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { reduceSession, type SessionAction } from "../../domain/session"
import { remainingMs } from "../../domain/timing"
import type { OptionId } from "../../domain/types"
import { METHODS } from "../../content/bank"
import { Explanation } from "../Explanation"
import { QuestionView } from "../QuestionView"
import type { Run } from "../run"
import { clockText, optionForKey, timeWarning, viewOf } from "../test/rules"
import { FinishConfirm, TestFooter, TestHeader } from "../test/TestParts"
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
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [confirming, setConfirming] = useState(false)
  const { timed, remaining, elapsed } = useRunClock(run, onEnd)
  const index = session.index

  // Move focus to each new question, so screen readers start reading it.
  useEffect(() => headingRef.current?.focus(), [index])

  const item = items[index]
  const question = paper.questions[index]
  if (!item || !question) return null

  const free = settings.navigation === "free"
  const { chosen, last, locked, primary, unanswered, flaggedCount, flagged } =
    viewOf({
      answers: session.answers,
      flags: session.flags,
      checked: run.checked,
      index,
      free,
      learn: settings.feedback === "instant",
    })

  const act = (action: SessionAction) => {
    const next = {
      ...run,
      session: reduceSession(run.session, action, settings.navigation),
    }
    if (next.session.status === "finished") onEnd(next)
    else onChange(next)
  }
  const choose = (option: OptionId) => {
    if (!locked) act({ type: "select", option })
  }
  const finish = () =>
    free && unanswered + flaggedCount > 0
      ? setConfirming(true)
      : act({ type: "finish", now: now() })
  const onPrimary = {
    check: () =>
      onChange({
        ...run,
        checked: run.checked.map((c, i) => c || i === index),
      }),
    finish,
    next: () => act({ type: "next", now: now() }),
    skip: () => act({ type: "next", now: now() }),
  }[primary]

  // Answer keys work only while focus is inside the test.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const option = optionForKey(e, question.optionOrder)
    if (!option) return
    e.preventDefault()
    choose(option)
  }

  return (
    <div className="at-test" onKeyDown={onKeyDown}>
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
        chosen={chosen}
        {...(locked ? {} : { onChoose: choose })}
        reveal={locked}
        headingRef={headingRef}
      />
      {locked && <Explanation item={item} method={METHODS[item.method]} />}
      {confirming ? (
        <FinishConfirm
          unanswered={unanswered}
          flagged={flaggedCount}
          onFinish={() => act({ type: "finish", now: now() })}
          onCancel={() => setConfirming(false)}
        />
      ) : (
        <TestFooter
          free={free}
          first={index === 0}
          last={last}
          flagged={flagged}
          primary={primary}
          primaryDisabled={primary === "check" && !chosen}
          onPrimary={onPrimary}
          onBack={() => act({ type: "back", now: now() })}
          onFlag={() => act({ type: "flag" })}
          onEnd={() => setConfirming(true)}
        />
      )}
    </div>
  )
}
