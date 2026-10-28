import type { FigureName, Visual } from "../domain/types"

// Figures are drawn from data on a 100 × 100 grid. Shapes are lopsided on
// purpose, so a mirror image never looks like a turn.
const SHAPES: Record<
  FigureName,
  { points?: string; rect?: [number, number, number, number] }[]
> = {
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

export function Figure({
  visual,
  size = 64,
}: {
  visual: Visual
  size?: number
}) {
  switch (visual.kind) {
    case "fig": {
      const transforms = [
        visual.flip ? "translate(100,0) scale(-1,1)" : "",
        visual.rot ? `rotate(${visual.rot} 50 50)` : "",
      ].join(" ")
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          aria-hidden="true"
          focusable="false"
        >
          <g
            transform={transforms}
            fill={visual.hollow ? "none" : "currentColor"}
            stroke="currentColor"
            strokeWidth="4"
            strokeLinejoin="round"
          >
            {SHAPES[visual.fig].map((s, i) =>
              s.points ? (
                <polygon key={i} points={s.points} />
              ) : s.rect ? (
                <rect
                  key={i}
                  x={s.rect[0]}
                  y={s.rect[1]}
                  width={s.rect[2]}
                  height={s.rect[3]}
                />
              ) : null
            )}
          </g>
        </svg>
      )
    }
    case "grid":
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          aria-hidden="true"
          focusable="false"
        >
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
        </svg>
      )
    case "poly": {
      const points = Array.from({ length: visual.sides }, (_, i) => {
        const a = ((-90 + (360 / visual.sides) * i) * Math.PI) / 180
        return `${(50 + 34 * Math.cos(a)).toFixed(1)},${(50 + 34 * Math.sin(a)).toFixed(1)}`
      }).join(" ")
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          aria-hidden="true"
          focusable="false"
        >
          <polygon
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinejoin="round"
          />
        </svg>
      )
    }
    case "dots": {
      const per = 4
      const rows = Math.ceil(visual.n / per)
      return (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          aria-hidden="true"
          focusable="false"
        >
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
            const r = Math.floor(i / per)
            const inRow = Math.min(per, visual.n - r * per)
            return (
              <circle
                key={i}
                cx={50 + ((i % per) - (inRow - 1) / 2) * 19}
                cy={50 + (r - (rows - 1) / 2) * 19}
                r="6"
                fill="currentColor"
              />
            )
          })}
        </svg>
      )
    }
    case "sym":
      return (
        <span className="at-sym" aria-hidden="true">
          {visual.v}
        </span>
      )
    case "q":
      return (
        <span
          className={size > 64 ? "at-qmark at-qmark-lg" : "at-qmark"}
          aria-hidden="true"
        >
          ?
        </span>
      )
  }
}
