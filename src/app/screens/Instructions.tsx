import {
  TIME_PRESETS,
  allowedSeconds,
  formatClock,
  type TimePresetId,
} from "../../domain/timing"
import type { TestSpec } from "../../domain/types"
import { questionCount, type Settings } from "../run"

interface Props {
  spec: TestSpec
  settings: Settings
  onChange: (s: Settings) => void
  onContinue: () => void
  onBack: () => void
}

export function Instructions({
  spec,
  settings,
  onChange,
  onContinue,
  onBack,
}: Props) {
  const count = questionCount(spec)
  const seconds = allowedSeconds(spec.seconds, settings.preset)
  const perQuestion = Math.round(spec.seconds / count)
  const oneWay = settings.navigation === "one-way"

  return (
    <div className="at-screen">
      <h1>{spec.name}</h1>
      <p className="at-lead">
        Reading this page isn&apos;t timed. The clock starts only when you press
        Start.
      </p>
      <ul className="at-facts">
        <li>
          <strong>{count} questions</strong> in{" "}
          <strong>
            {seconds ? formatClock(seconds * 1000) : "no time limit"}
          </strong>
          {settings.preset === "standard" && (
            <> (about {perQuestion} seconds each)</>
          )}
        </li>
        <li>5 answers to choose from on every question</li>
        <li>
          {oneWay
            ? "You can skip a question, but you can't go back to it."
            : "You can go back, change answers and flag questions to revisit."}
        </li>
        <li>
          Unanswered questions count as wrong, so guess rather than leave one
          blank.
        </li>
        <li>Have paper and a pen ready. No calculator.</li>
      </ul>

      <details className="at-options-panel">
        <summary>Options</summary>
        <fieldset>
          <legend>Time</legend>
          {TIME_PRESETS.map(p => (
            <label key={p.id} className="at-choice">
              <input
                type="radio"
                name="preset"
                checked={settings.preset === p.id}
                onChange={() =>
                  onChange({ ...settings, preset: p.id as TimePresetId })
                }
              />
              {p.label}
              {p.factor > 0 &&
                ` (${formatClock(allowedSeconds(spec.seconds, p.id) * 1000)})`}
            </label>
          ))}
        </fieldset>
        {spec.navigation === "free" ? (
          <fieldset>
            <legend>Marking</legend>
            <label className="at-choice">
              <input
                type="radio"
                name="feedback"
                checked={settings.feedback === "end"}
                onChange={() => onChange({ ...settings, feedback: "end" })}
              />
              At the end, like a real test
            </label>
            <label className="at-choice">
              <input
                type="radio"
                name="feedback"
                checked={settings.feedback === "instant"}
                onChange={() => onChange({ ...settings, feedback: "instant" })}
              />
              Learn: check each answer as you go
            </label>
          </fieldset>
        ) : (
          <label className="at-choice">
            <input
              type="checkbox"
              checked={settings.navigation === "free"}
              onChange={e =>
                onChange({
                  ...settings,
                  navigation: e.target.checked ? "free" : "one-way",
                })
              }
            />
            Allow going back (easier than most real tests)
          </label>
        )}
      </details>

      <div className="at-actions">
        <button type="button" className="at-primary" onClick={onContinue}>
          Continue to the worked example
        </button>
        <button type="button" className="at-link" onClick={onBack}>
          Choose a different test
        </button>
      </div>
    </div>
  )
}
