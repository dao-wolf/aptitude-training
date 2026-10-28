import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { reduceSession, type SessionAction } from "../../domain/session"
import { formatClock, remainingMs } from "../../domain/timing"
import { METHODS } from "../../content/bank"
import { Explanation } from "../Explanation"
import { QuestionView } from "../QuestionView"
import { CATEGORY_LABEL } from "../labels"
import type { Run } from "../run"
import { now, useNow } from "../useNow"

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

interface Props {
  run: Run
  onChange: (run: Run) => void
  onEnd: (run: Run) => void
}

export function TestScreen({ run, onChange, onEnd }: Props) {
  const { session, items, paper, limitSeconds, settings } = run
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [confirming, setConfirming] = useState(false)
  const t = useNow(session.status === "running")
  const remaining = remainingMs(t, session.startedAt, limitSeconds)
  const timed = limitSeconds > 0

  const index = session.index
  const item = items[index]
  const question = paper.questions[index]
  const free = settings.navigation === "free"
  const learn = settings.feedback === "instant"
  const chosen = session.answers[index] ?? null
  const checked = run.checked[index] ?? false
  const last = index === items.length - 1

  const act = (action: SessionAction) => {
    const next = {
      ...run,
      session: reduceSession(run.session, action, settings.navigation),
    }
    if (next.session.status === "finished") onEnd(next)
    else onChange(next)
  }

  // Move focus to each new question, so screen readers start reading it.
  useEffect(() => {
    headingRef.current?.focus()
  }, [index])

  // Time up: end the sitting with the answers given so far.
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

  // Spoken time warnings, derived from the clock: they change only twice.
  const warning =
    timed && remaining <= 60000
      ? "1 minute left"
      : timed && remaining <= 300000 && limitSeconds > 300
        ? "5 minutes left"
        : ""

  if (!item || !question) return null

  const choose = (option: (typeof item.options)[number]["id"]) => {
    if (learn && checked) return
    act({ type: "select", option })
  }

  // Answer keys work only while focus is inside the test, never with Cmd, Ctrl or Alt.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
    const pos = KEY_TO_POSITION[e.key.toLowerCase()]
    const option = pos === undefined ? undefined : question.optionOrder[pos]
    if (option) {
      e.preventDefault()
      choose(option)
    }
  }

  const unanswered = session.answers.filter(a => a === null).length
  const flagged = session.flags.filter(Boolean).length
  const finish = () =>
    free && (unanswered > 0 || flagged > 0)
      ? setConfirming(true)
      : act({ type: "finish", now: now() })
  const elapsed = Math.max(0, t - session.startedAt)
  const lowTime = timed && remaining <= 60000

  return (
    <div className="at-test" onKeyDown={onKeyDown}>
      <header className="at-test-header">
        <div>
          <p className="at-eyebrow">{CATEGORY_LABEL[item.category]}</p>
          <p className="at-count">
            Question {index + 1} of {items.length}
          </p>
        </div>
        <p
          className={`at-clock ${lowTime ? "is-low" : ""}`}
          aria-label={timed ? "Time left" : "Time taken"}
        >
          {timed
            ? formatClock(remaining)
            : `No clock · ${formatClock(elapsed)}`}
          {lowTime && <span className="at-sr"> (under a minute)</span>}
        </p>
        <progress
          className="at-progress"
          max={items.length}
          value={index}
          aria-label="Progress"
        />
      </header>

      <p className="at-sr" aria-live="polite">
        Question {index + 1} of {items.length}
      </p>
      <p className="at-sr" aria-live="assertive">
        {warning}
      </p>

      <QuestionView
        key={index}
        item={item}
        optionOrder={question.optionOrder}
        chosen={chosen}
        {...(learn && checked ? {} : { onChoose: choose })}
        reveal={learn && checked}
        headingRef={headingRef}
      />
      {learn && checked && (
        <Explanation item={item} method={METHODS[item.method]} />
      )}

      {confirming ? (
        <div
          className="at-confirm"
          role="alertdialog"
          aria-label="Finish the test?"
        >
          <p>
            You have {unanswered} unanswered{" "}
            {unanswered === 1 ? "question" : "questions"}
            {flagged > 0 && ` and ${flagged} flagged`}. Finish anyway?
          </p>
          <div className="at-actions">
            <button
              type="button"
              className="at-primary"
              onClick={() => act({ type: "finish", now: now() })}
            >
              Finish
            </button>
            <button
              type="button"
              className="at-secondary"
              onClick={() => setConfirming(false)}
            >
              Keep going
            </button>
          </div>
        </div>
      ) : (
        <footer className="at-test-footer">
          {free && (
            <button
              type="button"
              className="at-secondary"
              disabled={index === 0}
              onClick={() => act({ type: "back", now: now() })}
            >
              Back
            </button>
          )}
          {free && (
            <button
              type="button"
              className="at-secondary"
              aria-pressed={session.flags[index]}
              onClick={() => act({ type: "flag" })}
            >
              {session.flags[index] ? "Flagged" : "Flag"}
            </button>
          )}
          {learn && !checked ? (
            <button
              type="button"
              className="at-primary"
              disabled={!chosen}
              onClick={() =>
                onChange({
                  ...run,
                  checked: run.checked.map((c, i) => (i === index ? true : c)),
                })
              }
            >
              Check answer
            </button>
          ) : last ? (
            <button type="button" className="at-primary" onClick={finish}>
              Finish
            </button>
          ) : (
            <button
              type="button"
              className="at-primary"
              onClick={() => act({ type: "next", now: now() })}
            >
              {!chosen && !free ? "Skip" : "Next"}
            </button>
          )}
          {!last && (
            <button
              type="button"
              className="at-link"
              onClick={() => setConfirming(true)}
            >
              End test
            </button>
          )}
        </footer>
      )}
    </div>
  )
}
