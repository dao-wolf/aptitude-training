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
  const item = items[step]

  useEffect(() => headingRef.current?.focus(), [step])

  if (!item) return null
  const worked = step === 0
  const last = step === items.length - 1
  const order = item.options.map(o => o.id)
  const next = () => {
    if (last) return onDone()
    setStep(step + 1)
    setChosen(null)
    setChecked(false)
  }

  return (
    <div className="at-screen">
      <p className="at-eyebrow">
        {worked ? "Worked example" : `Practice ${step} of ${items.length - 1}`}{" "}
        · not scored
      </p>
      <h1 ref={headingRef} tabIndex={-1} className="at-sr-heading">
        {worked ? "Worked example" : `Practice question ${step}`}
      </h1>
      <QuestionView
        item={item}
        optionOrder={order}
        chosen={worked ? item.answer : chosen}
        {...(worked || checked ? {} : { onChoose: setChosen })}
        reveal={worked || checked}
      />
      {(worked || checked) && (
        <>
          {!worked && (
            <p className="at-status" role="status">
              {chosen === item.answer
                ? "✓ Correct."
                : "✗ Not quite. The correct answer is marked."}
            </p>
          )}
          <Explanation item={item} method={METHODS[item.method]} />
        </>
      )}
      <div className="at-actions">
        {!worked && !checked ? (
          <button
            type="button"
            className="at-primary"
            disabled={!chosen}
            onClick={() => setChecked(true)}
          >
            Check answer
          </button>
        ) : (
          <button type="button" className="at-primary" onClick={next}>
            {last ? "I'm ready" : "Next practice question"}
          </button>
        )}
        {!worked && checked && chosen !== item.answer && (
          <button
            type="button"
            className="at-secondary"
            onClick={() => {
              setChosen(null)
              setChecked(false)
            }}
          >
            Try again
          </button>
        )}
        <button type="button" className="at-link" onClick={onDone}>
          Skip practice
        </button>
      </div>
    </div>
  )
}
