import { CATEGORY_LABEL } from "../labels"
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
  return (
    <header className="at-test-header">
      <div>
        <p className="at-eyebrow">{CATEGORY_LABEL[category]}</p>
        <p className="at-count">
          Question {index + 1} of {total}
        </p>
      </div>
      <p
        className={lowTime ? "at-clock is-low" : "at-clock"}
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
        onClick={p.onPrimary}
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
