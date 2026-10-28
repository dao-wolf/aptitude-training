import { useEffect, useRef, useState, type Ref } from "react"
import type { QuestionResult, Summary } from "../../domain/scoring"
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

const FILTER_TEST: Record<
  Filter,
  (r: QuestionResult, flagged: boolean) => boolean
> = {
  all: () => true,
  wrong: r => r.chosen !== null && !r.correct,
  skipped: r => r.chosen === null,
  flagged: (_r, flagged) => flagged,
}

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

  const matches = summary.results.flatMap((r, i) =>
    FILTER_TEST[filter](r, run.session.flags[i] ?? false) ? [i] : []
  )
  const current = matches.includes(index) ? index : matches[0]
  useEffect(() => headingRef.current?.focus(), [current])

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
      {current === undefined ? (
        <p className="at-lead">No questions match.</p>
      ) : (
        <ReviewQuestion
          run={run}
          result={summary.results[current]}
          index={current}
          headingRef={headingRef}
        />
      )}
      <ReviewNav
        matches={matches}
        current={current}
        onGo={setIndex}
        onDone={onDone}
      />
    </div>
  )
}

interface QuestionProps {
  run: Run
  result: QuestionResult | undefined
  index: number
  headingRef: Ref<HTMLHeadingElement>
}

function ReviewQuestion({ run, result, index, headingRef }: QuestionProps) {
  const item = run.items[index]
  const question = run.paper.questions[index]
  if (!item || !question || !result) return null
  return (
    <>
      <p className="at-eyebrow">
        Question {index + 1} of {run.items.length} ·{" "}
        {CATEGORY_LABEL[item.category]} · {(result.spentMs / 1000).toFixed(1)}s
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
    </>
  )
}

interface NavProps {
  matches: number[]
  current: number | undefined
  onGo: (index: number) => void
  onDone: () => void
}

function ReviewNav({ matches, current, onGo, onDone }: NavProps) {
  const pos = current === undefined ? -1 : matches.indexOf(current)
  return (
    <div className="at-actions">
      {pos >= 0 && (
        <>
          <button
            type="button"
            className="at-secondary"
            disabled={pos === 0}
            onClick={() => onGo(matches[pos - 1] ?? 0)}
          >
            Previous
          </button>
          <button
            type="button"
            className="at-secondary"
            disabled={pos === matches.length - 1}
            onClick={() => onGo(matches[pos + 1] ?? 0)}
          >
            Next
          </button>
        </>
      )}
      <button type="button" className="at-link" onClick={onDone}>
        Back to your result
      </button>
    </div>
  )
}
