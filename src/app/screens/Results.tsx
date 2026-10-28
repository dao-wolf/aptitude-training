import { useEffect, useRef } from "react"
import type { Summary } from "../../domain/scoring"
import type { Category } from "../../domain/types"
import { CATEGORY_LABEL } from "../labels"
import type { Run } from "../run"

interface Props {
  run: Run
  summary: Summary
  onReview: (index: number) => void
  onRetry: () => void
  onDrill: (category: Category) => void
  onHome: () => void
}

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`

export function Results({
  run,
  summary,
  onReview,
  onRetry,
  onDrill,
  onHome,
}: Props) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => ref.current?.focus(), [])
  const categories = Object.entries(summary.byCategory) as [
    Category,
    NonNullable<Summary["byCategory"][Category]>,
  ][]
  const accuracy = summary.answered
    ? Math.round((summary.correct / summary.answered) * 100)
    : 0
  const weakest =
    categories.length > 1
      ? [...categories].sort(
          (a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total
        )[0]?.[0]
      : undefined
  const timeUp = run.session.endReason === "time-up"

  return (
    <div className="at-screen">
      <h1 ref={ref} tabIndex={-1}>
        Your result
      </h1>
      <p className="at-score">
        {summary.correct} of {summary.total} correct{" "}
        <span>({summary.percent}%)</span>
      </p>
      {timeUp && (
        <p className="at-lead">
          Time ran out. Unanswered questions count as wrong.
        </p>
      )}

      <dl className="at-tiles">
        <div>
          <dt>Answered</dt>
          <dd>{summary.answered}</dd>
        </div>
        <div>
          <dt>Skipped or unanswered</dt>
          <dd>{summary.skipped}</dd>
        </div>
        <div>
          <dt>Reached question</dt>
          <dd>{summary.reached}</dd>
        </div>
        <div>
          <dt>Average time a question</dt>
          <dd>{seconds(summary.averageMs)}</dd>
        </div>
      </dl>
      <p>
        <strong>Accuracy:</strong> {accuracy}% of the questions you answered
        were right. <strong>Speed:</strong> you reached {summary.reached} of{" "}
        {summary.total}.
      </p>

      {categories.length > 1 && (
        <table className="at-table">
          <caption>By section</caption>
          <thead>
            <tr>
              <th scope="col">Section</th>
              <th scope="col">Correct</th>
              <th scope="col">Average time</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(([c, s]) => (
              <tr key={c}>
                <th scope="row">{CATEGORY_LABEL[c]}</th>
                <td>
                  {s.correct} of {s.total}
                </td>
                <td>{seconds(s.total ? s.spentMs / s.total : 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="at-section-title">Every question</h2>
      <ol
        className="at-grid"
        aria-label="Every question: choose one to review it"
      >
        {summary.results.map((r, i) => {
          const state = r.correct ? "right" : r.chosen ? "wrong" : "blank"
          const word = r.correct ? "right" : r.chosen ? "wrong" : "unanswered"
          return (
            <li key={i}>
              <button
                type="button"
                className={`at-cell is-${state}`}
                onClick={() => onReview(i)}
                aria-label={`Question ${i + 1}: ${word}`}
              >
                <span aria-hidden="true">
                  {r.correct ? "✓" : r.chosen ? "✗" : "–"}
                </span>
                <span className="at-cell-n" aria-hidden="true">
                  {i + 1}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <p className="at-note">
        Employers compare scores with a group of earlier test-takers. We
        don&apos;t have one, so there&apos;s no pass mark or percentile here:
        use this to see your pace and where you lose marks.
      </p>

      <div className="at-actions">
        <button
          type="button"
          className="at-primary"
          onClick={() => onReview(0)}
        >
          Review answers
        </button>
        {weakest && (
          <button
            type="button"
            className="at-secondary"
            onClick={() => onDrill(weakest)}
          >
            Start here: {CATEGORY_LABEL[weakest].toLowerCase()} drill
          </button>
        )}
        <button type="button" className="at-secondary" onClick={onRetry}>
          Try a new paper
        </button>
        <button type="button" className="at-link" onClick={onHome}>
          Choose another test
        </button>
      </div>
    </div>
  )
}
