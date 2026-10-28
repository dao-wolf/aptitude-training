import { useEffect, useRef } from "react"
import type {
  CategorySummary,
  QuestionResult,
  Summary,
} from "../../domain/scoring"
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
type Section = [Category, CategorySummary]

/** The section with the lowest share correct, when there's more than one. */
export function weakestSection(sections: Section[]): Category | undefined {
  if (sections.length < 2) return undefined
  return [...sections].sort(
    (a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total
  )[0]?.[0]
}

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
  const sections = Object.entries(summary.byCategory) as Section[]
  const weakest = weakestSection(sections)

  return (
    <div className="at-screen">
      <h1 ref={ref} tabIndex={-1}>
        Your result
      </h1>
      <p className="at-score">
        {summary.correct} of {summary.total} correct{" "}
        <span>({summary.percent}%)</span>
      </p>
      {run.session.endReason === "time-up" && (
        <p className="at-lead">
          Time ran out. Unanswered questions count as wrong.
        </p>
      )}
      <Tiles summary={summary} />
      {sections.length > 1 && <SectionTable sections={sections} />}
      <h2 className="at-section-title">Every question</h2>
      <QuestionGrid results={summary.results} onReview={onReview} />
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

function Tiles({ summary }: { summary: Summary }) {
  const accuracy = summary.answered
    ? Math.round((summary.correct / summary.answered) * 100)
    : 0
  const tiles: [string, string | number][] = [
    ["Answered", summary.answered],
    ["Skipped or unanswered", summary.skipped],
    ["Reached question", summary.reached],
    ["Average time a question", seconds(summary.averageMs)],
  ]
  return (
    <>
      <dl className="at-tiles">
        {tiles.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p>
        <strong>Accuracy:</strong> {accuracy}% of the questions you answered
        were right. <strong>Speed:</strong> you reached {summary.reached} of{" "}
        {summary.total}.
      </p>
    </>
  )
}

function SectionTable({ sections }: { sections: Section[] }) {
  return (
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
        {sections.map(([c, s]) => (
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
  )
}

const CELL = {
  right: { icon: "✓", word: "right" },
  wrong: { icon: "✗", word: "wrong" },
  blank: { icon: "–", word: "unanswered" },
} as const

const cellState = (r: QuestionResult): keyof typeof CELL =>
  r.correct ? "right" : r.chosen ? "wrong" : "blank"

function QuestionGrid({
  results,
  onReview,
}: {
  results: QuestionResult[]
  onReview: (index: number) => void
}) {
  return (
    <ol
      className="at-grid"
      aria-label="Every question: choose one to review it"
    >
      {results.map((r, i) => {
        const state = cellState(r)
        return (
          <li key={i}>
            <button
              type="button"
              className={`at-cell is-${state}`}
              onClick={() => onReview(i)}
              aria-label={`Question ${i + 1}: ${CELL[state].word}`}
            >
              <span aria-hidden="true">{CELL[state].icon}</span>
              <span className="at-cell-n" aria-hidden="true">
                {i + 1}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
