import { useEffect, useRef } from "react"
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
  useEffect(() => ref.current?.focus(), [])
  return (
    <div className="at-screen">
      <h1 ref={ref} tabIndex={-1}>
        Ready?
      </h1>
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
