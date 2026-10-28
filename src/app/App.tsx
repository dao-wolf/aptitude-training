import { useMemo, useState } from "react"
import { score } from "../domain/scoring"
import { parseSeed } from "../domain/seed"
import { drill } from "../domain/specs"
import type { Category, Item, TestSpec } from "../domain/types"
import { practiceFor } from "../content/bank"
import { Instructions } from "./screens/Instructions"
import { Landing } from "./screens/Landing"
import { Practice } from "./screens/Practice"
import { Ready } from "./screens/Ready"
import { Results } from "./screens/Results"
import { Review } from "./screens/Review"
import { TestScreen } from "./screens/TestScreen"
import { TimeUp } from "./screens/TimeUp"
import {
  defaultSettings,
  newSeed,
  questionCount,
  specCategories,
  startRun,
  type Run,
  type Settings,
} from "./run"
import { rememberSeen } from "./storage"
import { now } from "./useNow"
import { allowedSeconds } from "../domain/timing"

type Screen =
  | { name: "landing" }
  | {
      name: "instructions" | "practice" | "ready"
      spec: TestSpec
      settings: Settings
    }
  | { name: "test" | "time-up" | "results"; run: Run }
  | { name: "review"; run: Run; start: number }

/** Worked example from the first category, then one practice question each from the next. */
function practiceItems(spec: TestSpec): Item[] {
  const cats = specCategories(spec)
  if (cats.length === 1 && cats[0]) return practiceFor(cats[0])
  return cats
    .map((c, i) => practiceFor(c)[i === 0 ? 0 : 1])
    .filter((i): i is Item => i !== undefined)
}

export function App({ seed: seedInput }: { seed?: string | null }) {
  const [screen, setScreen] = useState<Screen>({ name: "landing" })
  // A seed from the page (attribute or address) fixes the first paper only.
  const [firstSeed, setFirstSeed] = useState(() => parseSeed(seedInput ?? null))

  const summary = useMemo(
    () =>
      "run" in screen && screen.run.session.status === "finished"
        ? score(screen.run.paper, screen.run.items, screen.run.session)
        : null,
    [screen]
  )

  const pick = (spec: TestSpec) =>
    setScreen({ name: "instructions", spec, settings: defaultSettings(spec) })
  const begin = (spec: TestSpec, settings: Settings) => {
    const run = startRun(spec, settings, firstSeed ?? newSeed(), now())
    setFirstSeed(null)
    setScreen({ name: "test", run })
  }
  const end = (run: Run) => {
    rememberSeen(run.paper.questions.map(q => q.itemId))
    setScreen({
      name: run.session.endReason === "time-up" ? "time-up" : "results",
      run,
    })
  }

  return (
    <main className="at-app">
      {screen.name === "landing" && <Landing onPick={pick} />}
      {screen.name === "instructions" && (
        <Instructions
          spec={screen.spec}
          settings={screen.settings}
          onChange={settings => setScreen({ ...screen, settings })}
          onContinue={() => setScreen({ ...screen, name: "practice" })}
          onBack={() => setScreen({ name: "landing" })}
        />
      )}
      {screen.name === "practice" && (
        <Practice
          items={practiceItems(screen.spec)}
          onDone={() => setScreen({ ...screen, name: "ready" })}
        />
      )}
      {screen.name === "ready" && (
        <Ready
          count={questionCount(screen.spec)}
          seconds={allowedSeconds(screen.spec.seconds, screen.settings.preset)}
          onStart={() => begin(screen.spec, screen.settings)}
        />
      )}
      {screen.name === "test" && (
        <TestScreen
          run={screen.run}
          onChange={run => setScreen({ name: "test", run })}
          onEnd={end}
        />
      )}
      {screen.name === "time-up" && (
        <TimeUp
          onContinue={() => setScreen({ name: "results", run: screen.run })}
        />
      )}
      {screen.name === "results" && summary && (
        <Results
          run={screen.run}
          summary={summary}
          onReview={start =>
            setScreen({ name: "review", run: screen.run, start })
          }
          onRetry={() =>
            setScreen({
              name: "ready",
              spec: screen.run.spec,
              settings: screen.run.settings,
            })
          }
          onDrill={(c: Category) => pick(drill(c))}
          onHome={() => setScreen({ name: "landing" })}
        />
      )}
      {screen.name === "review" && summary && (
        <Review
          run={screen.run}
          summary={summary}
          start={screen.start}
          onDone={() => setScreen({ name: "results", run: screen.run })}
        />
      )}
    </main>
  )
}
