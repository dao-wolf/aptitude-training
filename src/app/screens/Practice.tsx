import { useEffect, useRef, useState } from "react"
import type { Item, OptionId } from "../../domain/types"
import { METHODS } from "../../content/bank"
import { Explanation } from "../Explanation"
import { QuestionView } from "../QuestionView"

interface Props {
  items: Item[]
  onDone: () => void
}

/** A worked example (already answered), then practice questions with feedback. None are scored. */
export function Practice({ items, onDone }: Props) {
  const [step, setStep] = useState(0)
  const [chosen, setChosen] = useState<OptionId | null>(null)
  const [checked, setChecked] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headingRef.current?.focus(), [step])

  const item = items[step]
  if (!item) return null
  const { worked, eyebrow, label, stage } = practiceStep(
    step,
    items.length,
    checked
  )
  const shown = stage !== "answering"
  const last = step === items.length - 1

  const next = () => {
    if (last) return onDone()
    setStep(step + 1)
    setChosen(null)
    setChecked(false)
  }

  return (
    <div className="at-screen">
      <p className="at-eyebrow">{eyebrow} · not scored</p>
      <h1 ref={headingRef} tabIndex={-1} className="at-sr-heading">
        {label}
      </h1>
      <QuestionView
        item={item}
        optionOrder={item.options.map(o => o.id)}
        chosen={worked ? item.answer : chosen}
        {...(shown ? {} : { onChoose: setChosen })}
        reveal={shown}
      />
      {shown && (
        <Feedback
          item={item}
          worked={worked}
          correct={chosen === item.answer}
        />
      )}
      <PracticeActions
        stage={stage}
        canCheck={chosen !== null}
        wrong={checked && chosen !== item.answer}
        last={last}
        onCheck={() => setChecked(true)}
        onNext={next}
        onRetry={() => {
          setChosen(null)
          setChecked(false)
        }}
        onSkip={onDone}
      />
    </div>
  )
}

/** Step 0 is the worked example; the rest are practice questions. */
function practiceStep(step: number, total: number, checked: boolean) {
  if (step === 0)
    return {
      worked: true,
      eyebrow: "Worked example",
      label: "Worked example",
      stage: "worked" as const,
    }
  return {
    worked: false,
    eyebrow: `Practice ${step} of ${total - 1}`,
    label: `Practice question ${step}`,
    stage: checked ? ("checked" as const) : ("answering" as const),
  }
}

function Feedback({
  item,
  worked,
  correct,
}: {
  item: Item
  worked: boolean
  correct: boolean
}) {
  return (
    <>
      {!worked && (
        <p className="at-status" role="status">
          {correct
            ? "✓ Correct."
            : "✗ Not quite. The correct answer is marked."}
        </p>
      )}
      <Explanation item={item} method={METHODS[item.method]} />
    </>
  )
}

interface ActionProps {
  stage: "worked" | "answering" | "checked"
  canCheck: boolean
  wrong: boolean
  last: boolean
  onCheck: () => void
  onNext: () => void
  onRetry: () => void
  onSkip: () => void
}

function PracticeActions({
  stage,
  canCheck,
  wrong,
  last,
  onCheck,
  onNext,
  onRetry,
  onSkip,
}: ActionProps) {
  return (
    <div className="at-actions">
      {stage === "answering" ? (
        <button
          type="button"
          className="at-primary"
          disabled={!canCheck}
          onClick={onCheck}
        >
          Check answer
        </button>
      ) : (
        <button type="button" className="at-primary" onClick={onNext}>
          {last ? "I'm ready" : "Next practice question"}
        </button>
      )}
      {wrong && (
        <button type="button" className="at-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
      <button type="button" className="at-link" onClick={onSkip}>
        Skip practice
      </button>
    </div>
  )
}
