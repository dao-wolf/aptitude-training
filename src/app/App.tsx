import { useMemo, useState, type ReactNode } from "react"
import { score, type Summary } from "../domain/scoring"
import { parseSeed } from "../domain/seed"
import { drill } from "../domain/specs"
import { allowedSeconds } from "../domain/timing"
import type { Item, TestSpec } from "../domain/types"
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

type Screen =
  | { name: "landing" }
  | {
      name: "instructions" | "practice" | "ready"
      spec: TestSpec
      settings: Settings
    }
  | { name: "test" | "time-up" | "results"; run: Run }
  | { name: "review"; run: Run; start: number }

// The screen state for one name (members like "instructions" | "practice" share a shape).
type Named<N extends Screen["name"], S = Screen> = S extends { name: infer M }
  ? N extends M
    ? S
    : never
  : never

/** Worked example from the first category, then one practice question each from the next. */
function practiceItems(spec: TestSpec): Item[] {
  const cats = specCategories(spec)
  if (cats.length === 1 && cats[0]) return practiceFor(cats[0])
  return cats
    .map((c, i) => practiceFor(c)[i === 0 ? 0 : 1])
    .filter((i): i is Item => i !== undefined)
}

const finishedSummary = (screen: Screen): Summary | null =>
  "run" in screen && screen.run.session.status === "finished"
    ? score(screen.run.paper, screen.run.items, screen.run.session)
    : null

export function App({ seed: seedInput }: { seed?: string | null }) {
  const [screen, setScreen] = useState<Screen>({ name: "landing" })
  // A seed from the page (attribute or address) fixes the first paper only.
  const [firstSeed, setFirstSeed] = useState(() => parseSeed(seedInput ?? null))
  const summary = useMemo(() => finishedSummary(screen), [screen])

  const pick = (spec: TestSpec) =>
    setScreen({ name: "instructions", spec, settings: defaultSettings(spec) })
  const begin = (spec: TestSpec, settings: Settings) => {
    setScreen({
      name: "test",
      run: startRun(spec, settings, firstSeed ?? newSeed(), now()),
    })
    setFirstSeed(null)
  }
  const end = (run: Run) => {
    rememberSeen(run.paper.questions.map(q => q.itemId))
    setScreen({
      name: run.session.endReason === "time-up" ? "time-up" : "results",
      run,
    })
  }
  const home = () => setScreen({ name: "landing" })

  // One small render function per screen.
  const views: { [N in Screen["name"]]: (s: Named<N>) => ReactNode } = {
    landing: () => <Landing onPick={pick} />,
    instructions: s => (
      <Instructions
        spec={s.spec}
        settings={s.settings}
        onChange={settings => setScreen({ ...s, settings })}
        onContinue={() => setScreen({ ...s, name: "practice" })}
        onBack={home}
      />
    ),
    practice: s => (
      <Practice
        items={practiceItems(s.spec)}
        onDone={() => setScreen({ ...s, name: "ready" })}
      />
    ),
    ready: s => (
      <Ready
        count={questionCount(s.spec)}
        seconds={allowedSeconds(s.spec.seconds, s.settings.preset)}
        onStart={() => begin(s.spec, s.settings)}
      />
    ),
    test: s => (
      <TestScreen
        run={s.run}
        onChange={run => setScreen({ name: "test", run })}
        onEnd={end}
      />
    ),
    "time-up": s => (
      <TimeUp onContinue={() => setScreen({ name: "results", run: s.run })} />
    ),
    results: s =>
      summary && (
        <Results
          run={s.run}
          summary={summary}
          onReview={start => setScreen({ name: "review", run: s.run, start })}
          onRetry={() =>
            setScreen({
              name: "ready",
              spec: s.run.spec,
              settings: s.run.settings,
            })
          }
          onDrill={c => pick(drill(c))}
          onHome={home}
        />
      ),
    review: s =>
      summary && (
        <Review
          run={s.run}
          summary={summary}
          start={s.start}
          onDone={() => setScreen({ name: "results", run: s.run })}
        />
      ),
  }
  const render = views[screen.name] as (s: Screen) => ReactNode

  return <main className="at-app">{render(screen)}</main>
}
