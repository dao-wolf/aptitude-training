import { useEffect, useRef, useState } from "react"
import type { Summary } from "../../domain/scoring"
import { METHODS } from "../../content/bank"
import { Explanation } from "../Explanation"
import { QuestionView } from "../QuestionView"
import { CATEGORY_LABEL } from "../labels"
import type { Run } from "../run"

type Filter = "all" | "wrong" | "skipped" | "flagged"
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "wrong", label: "Wrong" },
  { id: "skipped", label: "Unanswered" },
  { id: "flagged", label: "Flagged" },
]

interface Props {
  run: Run
  summary: Summary
  start: number
  onDone: () => void
}

export function Review({ run, summary, start, onDone }: Props) {
  const [filter, setFilter] = useState<Filter>("all")
  const [index, setIndex] = useState(start)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const matches = summary.results
    .map((r, i) => ({ r, i }))
    .filter(({ r, i }) =>
      filter === "all"
        ? true
        : filter === "wrong"
          ? r.chosen !== null && !r.correct
          : filter === "skipped"
            ? r.chosen === null
            : run.session.flags[i]
    )
    .map(({ i }) => i)
  const current = matches.includes(index) ? index : matches[0]
  const pos = current === undefined ? -1 : matches.indexOf(current)

  useEffect(() => headingRef.current?.focus(), [current])

  const item = current === undefined ? undefined : run.items[current]
  const question =
    current === undefined ? undefined : run.paper.questions[current]
  const result = current === undefined ? undefined : summary.results[current]

  return (
    <div className="at-screen">
      <h1>Review</h1>
      <fieldset className="at-filters">
        <legend className="at-sr">Show</legend>
        {FILTERS.map(f => (
          <label key={f.id} className="at-chip">
            <input
              type="radio"
              name="filter"
              checked={filter === f.id}
              onChange={() => setFilter(f.id)}
            />
            {f.label}
          </label>
        ))}
      </fieldset>

      {item && question && result && current !== undefined ? (
        <>
          <p className="at-eyebrow">
            Question {current + 1} of {run.items.length} ·{" "}
            {CATEGORY_LABEL[item.category]} ·{" "}
            {(result.spentMs / 1000).toFixed(1)}s
            {result.chosen === null && " · unanswered"}
          </p>
          <QuestionView
            item={item}
            optionOrder={question.optionOrder}
            chosen={result.chosen}
            reveal
            headingRef={headingRef}
          />
          <Explanation item={item} method={METHODS[item.method]} />
          <div className="at-actions">
            <button
              type="button"
              className="at-secondary"
              disabled={pos <= 0}
              onClick={() => setIndex(matches[pos - 1] ?? 0)}
            >
              Previous
            </button>
            <button
              type="button"
              className="at-secondary"
              disabled={pos >= matches.length - 1}
              onClick={() => setIndex(matches[pos + 1] ?? 0)}
            >
              Next
            </button>
            <button type="button" className="at-link" onClick={onDone}>
              Back to your result
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="at-lead">No questions match.</p>
          <button type="button" className="at-link" onClick={onDone}>
            Back to your result
          </button>
        </>
      )}
    </div>
  )
}
