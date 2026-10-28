import { useEffect, useRef } from "react"

export function TimeUp({ onContinue }: { onContinue: () => void }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => ref.current?.focus(), [])
  return (
    <div className="at-screen">
      <h1 ref={ref} tabIndex={-1}>
        Time&apos;s up
      </h1>
      <p className="at-lead">We&apos;ve kept the answers you gave.</p>
      <div className="at-actions">
        <button type="button" className="at-primary" onClick={onContinue}>
          See your result
        </button>
      </div>
    </div>
  )
}
