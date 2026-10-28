import { useEffect, useRef, useState } from "react"

// Step 1 spike: proves focus, live announcements and radio semantics work
// inside the shadow root. Replaced by the real app in step 2.
const QUESTIONS = ["First question", "Second question", "Third question"]

export function App() {
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const movedRef = useRef(false)

  useEffect(() => {
    if (movedRef.current) headingRef.current?.focus()
  }, [index])

  const next = () => {
    movedRef.current = true
    setPicked(null)
    setIndex(i => Math.min(i + 1, QUESTIONS.length - 1))
  }

  return (
    <main className="at-app">
      <h1 className="at-title">Aptitude Training</h1>
      <p className="at-live" aria-live="polite">
        Question {index + 1} of {QUESTIONS.length}
      </p>
      <h2 ref={headingRef} tabIndex={-1}>
        {QUESTIONS[index]}
      </h2>
      <fieldset>
        <legend>Pick one</legend>
        {["A", "B", "C"].map(letter => (
          <label key={letter} className="at-option">
            <input
              type="radio"
              name={`q${index}`}
              value={letter}
              checked={picked === letter}
              onChange={() => setPicked(letter)}
            />
            Option {letter}
          </label>
        ))}
      </fieldset>
      <button type="button" className="at-next" onClick={next}>
        Next
      </button>
    </main>
  )
}
