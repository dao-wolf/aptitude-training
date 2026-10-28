import { useRef } from "react"
import { CATEGORY_LABEL } from "../labels"
import { useOutOfView } from "../layout"
import type { Category } from "../../domain/types"
import type { PrimaryAction } from "./rules"

interface HeaderProps {
  category: Category
  index: number
  total: number
  clock: string
  timed: boolean
  lowTime: boolean
}

export function TestHeader({
  category,
  index,
  total,
  clock,
  timed,
  lowTime,
}: HeaderProps) {
  const ref = useRef<HTMLElement>(null)
  // Some host pages break position: sticky (e.g. overflow-x: hidden on body).
  // When the header scrolls away anyway, a small fixed pill keeps the clock in view.
  const docked = useOutOfView(ref)
  return (
    <>
      {docked && (
        <p
          className={lowTime ? "at-dock is-low" : "at-dock"}
          aria-hidden="true"
          data-clock
        >
          {index + 1}/{total} · {clock}
        </p>
      )}
      <header className="at-test-header" ref={ref}>
        <div>
          <p className="at-eyebrow">{CATEGORY_LABEL[category]}</p>
          <p className="at-count">
            Question {index + 1} of {total}
          </p>
        </div>
        <p
          className={lowTime ? "at-clock is-low" : "at-clock"}
          data-clock
          aria-label={timed ? "Time left" : "Time taken"}
        >
          {clock}
          {lowTime && <span className="at-sr"> (under a minute)</span>}
        </p>
        <progress
          className="at-progress"
          max={total}
          value={index}
          aria-label="Progress"
        />
      </header>
    </>
  )
}

interface ConfirmProps {
  unanswered: number
  flagged: number
  onFinish: () => void
  onCancel: () => void
}

export function FinishConfirm({
  unanswered,
  flagged,
  onFinish,
  onCancel,
}: ConfirmProps) {
  return (
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
        <button type="button" className="at-primary" onClick={onFinish}>
          Finish
        </button>
        <button type="button" className="at-secondary" onClick={onCancel}>
          Keep going
        </button>
      </div>
    </div>
  )
}

const PRIMARY_LABEL: Record<PrimaryAction, string> = {
  check: "Check answer",
  finish: "Finish",
  next: "Next",
  skip: "Skip",
}

interface FooterProps {
  free: boolean
  first: boolean
  last: boolean
  flagged: boolean
  primary: PrimaryAction
  primaryDisabled: boolean
  onPrimary: () => void
  onBack: () => void
  onFlag: () => void
  onEnd: () => void
}

export function TestFooter(p: FooterProps) {
  return (
    <footer className="at-test-footer">
      {p.free && (
        <>
          <button
            type="button"
            className="at-secondary"
            disabled={p.first}
            onClick={p.onBack}
          >
            Back
          </button>
          <button
            type="button"
            className="at-secondary"
            aria-pressed={p.flagged}
            onClick={p.onFlag}
          >
            {p.flagged ? "Flagged" : "Flag"}
          </button>
        </>
      )}
      <button
        type="button"
        className="at-primary"
        disabled={p.primaryDisabled}
        onClick={e => e.detail <= 1 && p.onPrimary()}
      >
        {PRIMARY_LABEL[p.primary]}
      </button>
      {!p.last && (
        <button type="button" className="at-link" onClick={p.onEnd}>
          End test
        </button>
      )}
    </footer>
  )
}
