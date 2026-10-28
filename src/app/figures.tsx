import type { ReactNode } from "react"
import type { FigureName, Visual } from "../domain/types"

// Figures are drawn from data on a 100 × 100 grid. Shapes are lopsided on
// purpose, so a mirror image never looks like a turn.
type Part = { points: string } | { rect: [number, number, number, number] }

const SHAPES: Record<FigureName, Part[]> = {
  flag: [{ rect: [27, 16, 7, 70] }, { points: "34,20 79,34 34,48" }],
  // A tall stem and a short foot: clearly different from its mirror image.
  ell: [{ points: "24,16 46,16 46,62 66,62 66,84 24,84" }],
  stairs: [{ points: "18,84 18,52 36,52 36,36 58,36 58,20 84,20 84,84" }],
  arrowTab: [
    {
      points:
        "16,44 40,44 40,28 54,28 54,44 58,44 58,24 88,50 58,76 58,56 16,56",
    },
  ],
  notch: [{ points: "18,18 58,18 82,42 82,82 48,82 48,62 30,62 30,82 18,82" }],
  tee: [{ points: "18,18 82,18 82,38 60,38 60,84 40,84 40,38 18,38" }],
}

type Props<K extends Visual["kind"]> = {
  visual: Extract<Visual, { kind: K }>
  size: number
}

function Svg({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

function Shape({ visual, size }: Props<"fig">) {
  const transform = [
    visual.flip ? "translate(100,0) scale(-1,1)" : "",
    visual.rot ? `rotate(${visual.rot} 50 50)` : "",
  ].join(" ")
  return (
    <Svg size={size}>
      <g
        transform={transform}
        fill={visual.hollow ? "none" : "currentColor"}
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      >
        {SHAPES[visual.fig].map((part, i) =>
          "points" in part ? (
            <polygon key={i} points={part.points} />
          ) : (
            <rect
              key={i}
              x={part.rect[0]}
              y={part.rect[1]}
              width={part.rect[2]}
              height={part.rect[3]}
            />
          )
        )}
      </g>
    </Svg>
  )
}

function Grid({ visual, size }: Props<"grid">) {
  return (
    <Svg size={size}>
      {Array.from({ length: 9 }, (_, i) => (
        <rect
          key={i}
          x={9 + (i % 3) * 28}
          y={9 + Math.floor(i / 3) * 28}
          width="26"
          height="26"
          rx="3"
          fill={visual.cells.includes(i) ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2.5"
        />
      ))}
    </Svg>
  )
}

function Polygon({ visual, size }: Props<"poly">) {
  const points = Array.from({ length: visual.sides }, (_, i) => {
    const a = ((-90 + (360 / visual.sides) * i) * Math.PI) / 180
    return `${(50 + 34 * Math.cos(a)).toFixed(1)},${(50 + 34 * Math.sin(a)).toFixed(1)}`
  }).join(" ")
  return (
    <Svg size={size}>
      <polygon
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

const PER_ROW = 4

function Dots({ visual, size }: Props<"dots">) {
  const rows = Math.ceil(visual.n / PER_ROW)
  return (
    <Svg size={size}>
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      {Array.from({ length: visual.n }, (_, i) => {
        const r = Math.floor(i / PER_ROW)
        const inRow = Math.min(PER_ROW, visual.n - r * PER_ROW)
        return (
          <circle
            key={i}
            cx={50 + ((i % PER_ROW) - (inRow - 1) / 2) * 19}
            cy={50 + (r - (rows - 1) / 2) * 19}
            r="6"
            fill="currentColor"
          />
        )
      })}
    </Svg>
  )
}

function Sym({ visual }: Props<"sym">) {
  return (
    <span className="at-sym" aria-hidden="true">
      {visual.v}
    </span>
  )
}

function QuestionMark({ size }: Props<"q">) {
  return (
    <span
      className={size > 64 ? "at-qmark at-qmark-lg" : "at-qmark"}
      aria-hidden="true"
    >
      ?
    </span>
  )
}

// One renderer per kind of figure. The cast is safe: each kind gets its own renderer.
const RENDERERS = {
  fig: Shape,
  grid: Grid,
  poly: Polygon,
  dots: Dots,
  sym: Sym,
  q: QuestionMark,
} as const

export function Figure({
  visual,
  size = 64,
}: {
  visual: Visual
  size?: number
}) {
  const Render = RENDERERS[visual.kind] as (p: {
    visual: Visual
    size: number
  }) => ReactNode
  return <Render visual={visual} size={size} />
}
