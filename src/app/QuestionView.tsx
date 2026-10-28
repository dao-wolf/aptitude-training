import { useId, type Ref } from "react"
import type { Item, OptionId } from "../domain/types"
import { Figure } from "./figures"
import { LETTERS } from "./labels"

interface Props {
  item: Item
  optionOrder: readonly OptionId[]
  chosen: OptionId | null
  /** Leave out to show the question read-only (review, worked example). */
  onChoose?: (option: OptionId) => void
  /** Mark the correct answer and the one chosen, in words as well as colour. */
  reveal?: boolean
  headingRef?: Ref<HTMLHeadingElement>
}

export function QuestionView({
  item,
  optionOrder,
  chosen,
  onChoose,
  reveal = false,
  headingRef,
}: Props) {
  const groupId = useId()
  const options = optionOrder
    .map(id => item.options.find(o => o.id === id))
    .filter(o => o !== undefined)
  const visual = item.kind === "visual"

  return (
    <div className="at-question">
      <h2 className="at-prompt" ref={headingRef} tabIndex={-1}>
        {item.prompt}
      </h2>
      {item.stem && (
        <div
          className="at-stem"
          role="img"
          aria-label="Pictures for this question"
        >
          {item.stem.map((v, i) => (
            <Figure key={i} visual={v} size={72} />
          ))}
        </div>
      )}
      <fieldset
        className={visual ? "at-options at-options-visual" : "at-options"}
      >
        <legend className="at-sr">Choose an answer</legend>
        {options.map((option, i) => {
          const letter = LETTERS[i] ?? "?"
          const isAnswer = option.id === item.answer
          const isChosen = option.id === chosen
          const state = reveal
            ? isAnswer
              ? "right"
              : isChosen
                ? "wrong"
                : ""
            : ""
          return (
            <label
              key={option.id}
              className={`at-option ${isChosen ? "is-chosen" : ""} ${state ? `is-${state}` : ""}`}
            >
              <input
                type="radio"
                name={groupId}
                value={option.id}
                checked={isChosen}
                disabled={!onChoose}
                onChange={() => onChoose?.(option.id)}
                aria-label={visual ? `Option ${letter}` : undefined}
              />
              <span className="at-letter" aria-hidden="true">
                {letter}
              </span>
              {option.visual ? (
                <Figure visual={option.visual} size={64} />
              ) : (
                <span className="at-option-text">{option.text}</span>
              )}
              {reveal && (isAnswer || isChosen) && (
                <span className="at-mark">
                  {isAnswer && isChosen && "✓ Your answer, correct"}
                  {isAnswer && !isChosen && "✓ Correct answer"}
                  {!isAnswer && isChosen && "✗ Your answer"}
                </span>
              )}
            </label>
          )
        })}
      </fieldset>
    </div>
  )
}
