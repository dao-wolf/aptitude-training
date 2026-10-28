import { useId, type Ref } from "react"
import type { Item, Option, OptionId } from "../domain/types"
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
        {options.map((option, i) => (
          <OptionRow
            key={option.id}
            option={option}
            letter={LETTERS[i] ?? "?"}
            group={groupId}
            visual={visual}
            isAnswer={option.id === item.answer}
            isChosen={option.id === chosen}
            reveal={reveal}
            {...(onChoose ? { onChoose } : {})}
          />
        ))}
      </fieldset>
    </div>
  )
}

interface RowProps {
  option: Option
  letter: string
  group: string
  visual: boolean
  isAnswer: boolean
  isChosen: boolean
  reveal: boolean
  onChoose?: (option: OptionId) => void
}

function OptionRow({
  option,
  letter,
  group,
  visual,
  isAnswer,
  isChosen,
  reveal,
  onChoose,
}: RowProps) {
  const mark = reveal ? markFor(isAnswer, isChosen) : null
  const classes = [
    "at-option",
    isChosen && "is-chosen",
    mark && `is-${mark.state}`,
  ]
    .filter(Boolean)
    .join(" ")
  return (
    <label className={classes}>
      <input
        type="radio"
        name={group}
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
      {mark && <span className="at-mark">{mark.text}</span>}
    </label>
  )
}

/** The words (and colour) for an option once answers are shown, or null for neither. */
export function markFor(
  isAnswer: boolean,
  isChosen: boolean
): { state: "right" | "wrong"; text: string } | null {
  if (isAnswer)
    return {
      state: "right",
      text: isChosen ? "✓ Your answer, correct" : "✓ Correct answer",
    }
  if (isChosen) return { state: "wrong", text: "✗ Your answer" }
  return null
}
