import { useRef } from "react"
import { Title, useRevealOnChange } from "../layout"

export function TimeUp({ onContinue }: { onContinue: () => void }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useRevealOnChange(ref, null)
  return (
    <div className="at-screen">
      <Title ref={ref}>Time&apos;s up</Title>
      <p className="at-lead">We&apos;ve kept the answers you gave.</p>
      <div className="at-actions">
        <button type="button" className="at-primary" onClick={onContinue}>
          See your result
        </button>
      </div>
    </div>
  )
}
