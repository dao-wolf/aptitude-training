import { useContext } from "react"
import { EmbeddedContext } from "../layout"
import { formatClock } from "../../domain/timing"
import { MIXED_SPRINT, drill } from "../../domain/specs"
import { CATEGORIES, type TestSpec } from "../../domain/types"
import { questionCount } from "../run"

const DESCRIPTIONS: Record<string, string> = {
  "mixed-sprint":
    "Verbal, maths and spatial questions mixed together. Few people finish: keep moving.",
  "drill-verbal": "Word meanings, analogies and logic.",
  "drill-maths": "Number series, percentages, ratios and word problems.",
  "drill-spatial": "Turning, mirroring and patterns in shapes and grids.",
}

export function Landing({ onPick }: { onPick: (spec: TestSpec) => void }) {
  const embedded = useContext(EmbeddedContext)
  const drills = CATEGORIES.map(c => drill(c))
  return (
    <div className="at-screen">
      {!embedded && (
        <>
          <h1>Aptitude Training</h1>
          <p className="at-lead">
            Free practice for aptitude tests. Timed like the real thing, with a
            worked explanation for every question.
          </p>
        </>
      )}

      <h2 className="at-section-title">Full test</h2>
      <Card spec={MIXED_SPRINT} onPick={onPick} />

      <h2 className="at-section-title">Short drills</h2>
      <div className="at-cards">
        {drills.map(spec => (
          <Card key={spec.id} spec={spec} onPick={onPick} />
        ))}
      </div>

      <p className="at-note">
        Practice only. All questions are original. Your score here doesn&apos;t
        predict your result on any real test. Coming next: reading-passage
        verbal reasoning, numerical reasoning with tables and charts, and
        abstract reasoning.
      </p>
      <p className="at-note">
        Accessibility: the spatial questions are pictures and need sight for
        now. Text descriptions are on the way.
      </p>
    </div>
  )
}

function Card({
  spec,
  onPick,
}: {
  spec: TestSpec
  onPick: (spec: TestSpec) => void
}) {
  return (
    <button type="button" className="at-card" onClick={() => onPick(spec)}>
      <span className="at-card-title">{spec.name}</span>
      <span className="at-card-meta">
        {questionCount(spec)} questions · {formatClock(spec.seconds * 1000)}
      </span>
      <span className="at-card-text">{DESCRIPTIONS[spec.id]}</span>
    </button>
  )
}
