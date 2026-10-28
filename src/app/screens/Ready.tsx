import { useRef } from "react"
import { Title, useRevealOnChange } from "../layout"
import { formatClock } from "../../domain/timing"

export function Ready({
  count,
  seconds,
  onStart,
}: {
  count: number
  seconds: number
  onStart: () => void
}) {
  const ref = useRef<HTMLHeadingElement>(null)
  useRevealOnChange(ref, null)
  return (
    <div className="at-screen">
      <Title ref={ref}>Ready?</Title>
      <p className="at-lead">
        {count} questions,{" "}
        {seconds
          ? `${formatClock(seconds * 1000)} on the clock`
          : "no time limit"}
        . The clock starts when you press Start.
      </p>
      <div className="at-actions">
        <button type="button" className="at-primary" onClick={onStart}>
          Start
        </button>
      </div>
    </div>
  )
}
