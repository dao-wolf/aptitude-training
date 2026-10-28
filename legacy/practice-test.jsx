import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";

/* ============================================================
   Aptitude Training: practice for aptitude tests
   50 questions - verbal / maths & logic / spatial
   Original practice items.
   ============================================================ */

const LETTERS = ["A", "B", "C", "D", "E"];
const PICK = { verbal: 17, maths: 17, spatial: 16 };
const QUESTION_COUNT = PICK.verbal + PICK.maths + PICK.spatial;
const MIN_MINUTES = 1;
const MAX_MINUTES = 180;
const clampMins = (n) => Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, n));
// Returns whole minutes inside the allowed range, or null if the field is not usable yet.
const parseMinutes = (text) => {
  const t = String(text).trim();
  if (!/^\d+$/.test(t)) return null;
  const n = parseInt(t, 10);
  return n >= MIN_MINUTES && n <= MAX_MINUTES ? n : null;
};
const CAT_LABEL = { verbal: "Verbal", maths: "Maths & logic", spatial: "Spatial" };

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sample = (arr, n) => shuffle(arr).slice(0, n);

// One row of the visual working shown in the how-to-solve panels.
const R = (label, ...cells) => ({ label, cells });

/* ---------------- figure primitives ---------------- */

// Plain-language landmark to track for each figure, used in the guidance.
const FIG_NAME = {
  flag: "the flag's triangle",
  ell: "the foot of the L",
  stairs: "the tall step",
  arrowTab: "the tab on the arrow",
  notch: "the bite in the bottom edge",
  tee: "the stem of the T",
};

const FIGURES = {
  flag: [{ r: [27, 16, 7, 70] }, { p: "34,20 79,34 34,48" }],
  ell: [{ p: "24,16 46,16 46,60 82,60 82,84 24,84" }],
  stairs: [{ p: "18,84 18,52 36,52 36,36 58,36 58,20 84,20 84,84" }],
  arrowTab: [
    { p: "16,44 40,44 40,28 54,28 54,44 58,44 58,24 88,50 58,76 58,56 16,56" },
  ],
  notch: [{ p: "18,18 58,18 82,42 82,82 48,82 48,62 30,62 30,82 18,82" }],
  tee: [{ p: "18,18 82,18 82,38 60,38 60,84 40,84 40,38 18,38" }],
};

const F = (fig, rot = 0, flip = false, hollow = false) => ({
  kind: "fig",
  fig,
  rot: ((rot % 360) + 360) % 360,
  flip,
  hollow,
});
const G = (cells) => ({ kind: "grid", cells: [...cells].sort((a, b) => a - b) });
const POLY = (sides) => ({ kind: "poly", sides });
const DOTS = (n) => ({ kind: "dots", n });
const QMARK = { kind: "q" };
const SYM = (v) => ({ kind: "sym", v });

function FigSvg({ spec, size }) {
  const parts = FIGURES[spec.fig] || [];
  const tr = [];
  if (spec.flip) tr.push("translate(100,0) scale(-1,1)");
  if (spec.rot) tr.push(`rotate(${spec.rot} 50 50)`);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <g
        transform={tr.join(" ")}
        fill={spec.hollow ? "none" : "currentColor"}
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      >
        {parts.map((p, i) =>
          p.p ? (
            <polygon key={i} points={p.p} />
          ) : p.r ? (
            <rect key={i} x={p.r[0]} y={p.r[1]} width={p.r[2]} height={p.r[3]} />
          ) : (
            <circle key={i} cx={p.c[0]} cy={p.c[1]} r={p.c[2]} />
          )
        )}
      </g>
    </svg>
  );
}

function GridSvg({ cells, size }) {
  const rects = [];
  for (let i = 0; i < 9; i++) {
    const r = Math.floor(i / 3);
    const c = i % 3;
    rects.push(
      <rect
        key={i}
        x={9 + c * 28}
        y={9 + r * 28}
        width="26"
        height="26"
        rx="3"
        fill={cells.includes(i) ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2.5"
      />
    );
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      {rects}
    </svg>
  );
}

function PolySvg({ sides, size }) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = ((-90 + (360 / sides) * i) * Math.PI) / 180;
    pts.push(
      `${(50 + 34 * Math.cos(a)).toFixed(1)},${(50 + 34 * Math.sin(a)).toFixed(1)}`
    );
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <polygon
        points={pts.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DotsSvg({ n, size }) {
  const per = 4;
  const rows = Math.ceil(n / per);
  const dots = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / per);
    const rowCount = Math.min(per, n - r * per);
    const c = i % per;
    dots.push(
      <circle
        key={i}
        cx={50 + (c - (rowCount - 1) / 2) * 19}
        cy={50 + (r - (rows - 1) / 2) * 19}
        r="6"
        fill="currentColor"
      />
    );
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.45"
      />
      {dots}
    </svg>
  );
}

function Visual({ item, size = 64 }) {
  if (!item) return null;
  if (item.kind === "fig") return <FigSvg spec={item} size={size} />;
  if (item.kind === "grid") return <GridSvg cells={item.cells} size={size} />;
  if (item.kind === "poly") return <PolySvg sides={item.sides} size={size} />;
  if (item.kind === "dots") return <DotsSvg n={item.n} size={size} />;
  if (item.kind === "sym")
    return (
      <span className="font-mono text-xl text-slate-500 select-none">{item.v}</span>
    );
  if (item.kind === "q")
    return (
      <span
        className="font-mono text-2xl text-sky-300 select-none"
        style={{ width: size, textAlign: "center" }}
      >
        ?
      </span>
    );
  return null;
}

/* ---------------- spatial question builders ---------------- */

let sid = 0;
const nid = () => `s${++sid}`;

const rotCells = (cells, times = 1) => {
  let out = [...cells];
  for (let t = 0; t < times; t++) {
    out = out.map((i) => {
      const r = Math.floor(i / 3);
      const c = i % 3;
      return c * 3 + (2 - r);
    });
  }
  return out;
};
const mirrorCells = (cells) =>
  cells.map((i) => {
    const r = Math.floor(i / 3);
    const c = i % 3;
    return r * 3 + (2 - c);
  });

// Chiral figures only, when a mirrored distractor is used.
function rotSeries(fig, step, dir, useFlip) {
  const r = (k) => dir * step * k;
  const options = [
    F(fig, r(3)),
    F(fig, r(1)),
    F(fig, r(2)),
    F(fig, r(4)),
    useFlip ? F(fig, r(3), true) : F(fig, r(3) + step / 2),
  ];
  const turn = dir > 0 ? "clockwise" : "anticlockwise";
  return {
    id: nid(),
    cat: "spatial",
    t: "rotation",
    prompt: "Which figure comes next in the series?",
    stem: [F(fig, r(0)), F(fig, r(1)), F(fig, r(2)), QMARK],
    options,
    answer: 0,
    why: `The figure turns ${step}° ${turn} at each step, so the next one is a further ${step}° turn.`,
    rows: [
      R("watch", FIG_NAME[fig]),
      R("each step", `${step}° ${turn}`, `${step}° ${turn}`, `${step}° ${turn}`, "answer"),
    ],
    steps: ["Track one feature, never the whole shape."],
    trap: "Mirrored options put the landmark on the wrong side.",
  };
}

function mirrorOdd(fig) {
  return {
    id: nid(),
    cat: "spatial",
    t: "mirror",
    prompt: "Four of these figures are the same shape turned round. Which one is different?",
    options: [F(fig, 0), F(fig, 90), F(fig, 270), F(fig, 180), F(fig, 90, true)],
    answer: 4,
    why: "Four figures are rotations of each other. The odd one is a mirror image, which no amount of turning can produce.",
    rows: [
      R("watch", FIG_NAME[fig]),
      R("turn", "keeps it on the same side"),
      R("flip", "swaps it to the other side"),
    ],
    steps: ["Ask which side it sits on. That is the whole question."],
    trap: "Four are rotations. One is flipped.",
  };
}

function rotAnalogy(figA, figB, rot) {
  return {
    id: nid(),
    cat: "spatial",
    prompt:
      "The first two figures are related in a certain way. Choose the figure that completes the second pair.",
    t: "figanalogy",
    stem: [F(figA, 0), SYM("→"), F(figA, rot), SYM("::"), F(figB, 0), SYM("→"), QMARK],
    options: [
      F(figB, rot),
      F(figB, rot + 90),
      F(figB, rot + 180),
      F(figB, rot, true),
      F(figB, rot + 180, true),
    ],
    answer: 0,
    why: `The first figure turns ${rot}° clockwise. Apply the same turn to the third figure.`,
    rows: [
      R("pair 1", `turn ${rot}° clockwise`),
      R("pair 2", `turn ${rot}° clockwise`),
      R("watch", FIG_NAME[figB]),
    ],
    steps: ["Name the change before reading the options."],
    trap: "Most options are the right shape at the wrong angle.",
  };
}

function flipAnalogy(figA, figB) {
  return {
    id: nid(),
    cat: "spatial",
    prompt:
      "The first two figures are related in a certain way. Choose the figure that completes the second pair.",
    t: "figanalogy",
    stem: [
      F(figA, 0),
      SYM("→"),
      F(figA, 0, true),
      SYM("::"),
      F(figB, 0),
      SYM("→"),
      QMARK,
    ],
    options: [F(figB, 0, true), F(figB, 180), F(figB, 90), F(figB, 180, true), F(figB, 270)],
    answer: 0,
    why: "The first figure is flipped left-to-right, not turned. Apply the same flip to the third figure.",
    rows: [
      R("pair 1", "flip left to right"),
      R("pair 2", "flip left to right"),
      R("watch", FIG_NAME[figB]),
    ],
    steps: ["A turn keeps handedness. A flip reverses it."],
  };
}

function mirrorPick(fig) {
  return {
    id: nid(),
    cat: "spatial",
    t: "mirror",
    prompt: "Which figure is the mirror image of the figure shown, reflected left to right?",
    stem: [F(fig, 0)],
    options: [F(fig, 0, true), F(fig, 180), F(fig, 90), F(fig, 180, true), F(fig, 270)],
    answer: 0,
    why: "A left-to-right reflection swaps the sides without turning the figure. The other options are rotations.",
    rows: [
      R("watch", FIG_NAME[fig]),
      R("flip", "right becomes left"),
      R("but", "top stays top"),
    ],
    steps: ["Top stays top rules out every rotation."],
  };
}

function shadeRot(fig) {
  return {
    id: nid(),
    cat: "spatial",
    t: "rotation",
    prompt: "Which figure comes next in the series?",
    stem: [F(fig, 0), F(fig, 90, false, true), F(fig, 180), QMARK],
    options: [
      F(fig, 270, false, true),
      F(fig, 270),
      F(fig, 0, false, true),
      F(fig, 270, true, true),
      F(fig, 90, false, true),
    ],
    answer: 0,
    why: "Two things change together: the figure turns 90° clockwise each step, and the shading alternates solid, outline, solid. Next is a 270° turn, outlined.",
    rows: [
      R("watch", FIG_NAME[fig]),
      R("rule 1", "90°", "90°", "90°", "90°"),
      R("rule 2", "solid", "outline", "solid", "outline"),
    ],
    steps: ["Two rules at once. Check both before answering."],
    trap: "Right angle, wrong fill is the near miss.",
  };
}

const PERIM = [0, 1, 2, 5, 8, 7, 6, 3];
function gridMove(start, dir) {
  const at = (k) => PERIM[(((start + dir * k) % 8) + 8) % 8];
  return {
    id: nid(),
    cat: "spatial",
    t: "gridmove",
    prompt: "Which grid comes next in the series?",
    stem: [G([at(0)]), G([at(1)]), G([at(2)]), QMARK],
    options: [G([at(3)]), G([at(2)]), G([at(4)]), G([at(-1)]), G([4])],
    answer: 0,
    why: `The shaded square moves one place ${dir > 0 ? "clockwise" : "anticlockwise"} round the edge of the grid each step.`,
    rows: [
      R("path", "one step", dir > 0 ? "clockwise" : "anticlockwise", "per frame"),
      R("route", ...(dir > 0 ? ["top-left", "top-mid", "top-right", "mid-right"] : ["top-right", "top-mid", "top-left", "mid-left"])),
    ],
    steps: ["Treat it as a dot on a loop, not a grid."],
    trap: "Corner to middle is one step. Do not skip it.",
  };
}

function gridMoveCentre(start, dir) {
  const at = (k) => PERIM[(((start + dir * k) % 8) + 8) % 8];
  return {
    id: nid(),
    cat: "spatial",
    prompt: "Which grid comes next in the series?",
    t: "gridmove",
    stem: [G([4, at(0)]), G([4, at(1)]), G([4, at(2)]), QMARK],
    options: [
      G([4, at(3)]),
      G([4, at(4)]),
      G([at(3)]),
      G([4, at(-1)]),
      G([4, at(2)]),
    ],
    answer: 0,
    why: "The centre square stays shaded throughout; the second shaded square moves one place clockwise round the edge each step.",
    rows: [R("fixed", "centre stays shaded"), R("moves", "one step clockwise")],
    steps: ["Park what does not change, then track what does."],
  };
}

function gridTwoMarkers() {
  const at = (k) => PERIM[(k % 8 + 8) % 8];
  const pair = (k) => G([at(k), at(k + 4)]);
  return {
    id: nid(),
    cat: "spatial",
    prompt: "Which grid comes next in the series?",
    t: "gridmove",
    stem: [pair(0), pair(1), pair(2), QMARK],
    options: [pair(3), pair(0), pair(2), G([6, 3]), G([5, 7])],
    answer: 0,
    why: "Both shaded squares move one place clockwise each step and stay directly opposite each other.",
    rows: [R("both", "one step clockwise"), R("check", "always opposite")],
    steps: ["Find the link between the two before moving either."],
  };
}

function gridRotOdd() {
  const P = [0, 1, 2, 5];
  return {
    id: nid(),
    cat: "spatial",
    t: "gridodd",
    prompt: "Four of these grids are the same pattern turned round. Which one is different?",
    options: [
      G(P),
      G(rotCells(P, 1)),
      G(rotCells(P, 2)),
      G(rotCells(P, 3)),
      G(mirrorCells(P)),
    ],
    answer: 4,
    why: "Four grids are rotations of the same four-square pattern. The odd one is a mirror image of it.",
    rows: [R("count", "4", "4", "4", "4", "4"), R("spin", "4 line up", "1 never does")],
    steps: ["Counting ties, so spin them instead."],
    trap: "The odd one is flipped, not turned.",
  };
}

function gridCountOdd() {
  return {
    id: nid(),
    cat: "spatial",
    t: "gridodd",
    prompt: "Which grid does not belong with the others?",
    options: [G([0, 1, 3, 4]), G([1, 2, 4, 5]), G([3, 4, 6, 7]), G([4, 5, 7, 8]), G([0, 2, 4, 6, 8])],
    answer: 4,
    why: "The other four each shade a block of four adjoining squares. This one shades five squares in a diagonal cross.",
    rows: [R("count", "4", "4", "4", "4", "5"), R("shape", "solid blocks", "one cross")],
    steps: ["Count first. Fastest check on the paper."],
  };
}

const SPATIAL = [
  rotSeries("flag", 90, 1, true),
  rotSeries("ell", 90, 1, true),
  rotSeries("arrowTab", 45, 1, true),
  rotSeries("stairs", 90, -1, false),
  rotSeries("tee", 90, 1, false),
  rotSeries("notch", 90, -1, true),
  mirrorOdd("flag"),
  mirrorOdd("ell"),
  mirrorOdd("arrowTab"),
  mirrorOdd("notch"),
  rotAnalogy("flag", "ell", 90),
  rotAnalogy("ell", "notch", 270),
  flipAnalogy("arrowTab", "flag"),
  mirrorPick("arrowTab"),
  mirrorPick("notch"),
  shadeRot("flag"),
  shadeRot("ell"),
  gridMove(0, 1),
  gridMove(2, -1),
  gridMoveCentre(6, 1),
  gridTwoMarkers(),
  gridRotOdd(),
  gridCountOdd(),
  {
    id: nid(),
    cat: "spatial",
    t: "countseries",
    prompt: "Which figure comes next in the series?",
    stem: [POLY(3), POLY(4), POLY(5), QMARK],
    options: [POLY(6), POLY(7), POLY(8), POLY(5), POLY(4)],
    answer: 0,
    why: "Each shape gains one side: triangle, square, pentagon, so a hexagon comes next.",
    rows: [R("sides", "3", "4", "5", "6")],
    steps: ["Count corners, not edges. Same number, faster."],
  },
  {
    id: nid(),
    cat: "spatial",
    t: "countseries",
    prompt: "Which card comes next in the series?",
    stem: [DOTS(2), DOTS(4), DOTS(6), QMARK],
    options: [DOTS(8), DOTS(7), DOTS(9), DOTS(10), DOTS(12)],
    answer: 0,
    why: "The number of dots goes up by two each time: 2, 4, 6, then 8.",
    rows: [R("count", "2", "4", "6", "8"), R("rule", "+2 each time")],
    steps: ["Adding or doubling? Doubling would give 2, 4, 8."],
  },
];

/* ---------------- verbal bank ---------------- */

const VERBAL = [
  {
    id: "v1",
    cat: "verbal",
    prompt: "Book is to library as painting is to:",
    options: ["Artist", "Gallery", "Canvas", "Frame", "Brush"],
    answer: 1,
    why: "A library is where books are kept and shown; a gallery is where paintings are kept and shown.",
  },
  {
    id: "v2",
    cat: "verbal",
    prompt: "Which word is most nearly OPPOSITE in meaning to 'candid'?",
    options: ["Frank", "Evasive", "Blunt", "Sincere", "Direct"],
    answer: 1,
    why: "Candid means open and straightforward. Evasive is its opposite; the rest are near synonyms.",
  },
  {
    id: "v3",
    cat: "verbal",
    prompt: "Which word is most similar in meaning to 'meticulous'?",
    options: ["Careless", "Painstaking", "Hasty", "Generous", "Timid"],
    answer: 1,
    why: "Meticulous means showing great attention to detail, which is what painstaking means.",
  },
  {
    id: "v4",
    cat: "verbal",
    prompt: "Whisper is to shout as trickle is to:",
    options: ["Drip", "Flood", "Stream", "Drop", "Leak"],
    answer: 1,
    why: "The pair moves from a very small version to a very large one: whisper to shout, trickle to flood.",
  },
  {
    id: "v5",
    cat: "verbal",
    prompt:
      "Although the report was ______, the committee still found several errors that had escaped the author's notice.",
    options: ["thorough", "careless", "brief", "hostile", "unread"],
    answer: 0,
    why: "'Although ... still found errors' sets up a contrast, so the report must have been thorough.",
  },
  {
    id: "v6",
    cat: "verbal",
    prompt: "Which word does not belong with the others?",
    options: ["Oak", "Maple", "Birch", "Shrub", "Elm"],
    answer: 3,
    why: "The others are all species of tree. A shrub is a different kind of plant altogether.",
  },
  {
    id: "v7",
    cat: "verbal",
    prompt:
      "All bakers in the town use rye flour. Marta uses rye flour. Which statement must be true?",
    options: [
      "Marta is a baker",
      "Marta is not a baker",
      "Some bakers do not use rye flour",
      "Marta may or may not be a baker",
      "Everyone who uses rye flour is a baker",
    ],
    answer: 3,
    why: "Bakers all use rye flour, but non-bakers may use it too, so Marta's trade is undetermined.",
  },
  {
    id: "v8",
    cat: "verbal",
    prompt: "Which word is most nearly OPPOSITE in meaning to 'abundant'?",
    options: ["Plentiful", "Scarce", "Ample", "Copious", "Lavish"],
    answer: 1,
    why: "Abundant means present in large quantity. Scarce is the opposite; the others all mean plentiful.",
  },
  {
    id: "v9",
    cat: "verbal",
    prompt: "Thermometer is to temperature as odometer is to:",
    options: ["Speed", "Distance", "Time", "Fuel", "Pressure"],
    answer: 1,
    why: "Each instrument is paired with what it measures. An odometer measures distance travelled.",
  },
  {
    id: "v10",
    cat: "verbal",
    prompt: "Which word is most similar in meaning to 'ephemeral'?",
    options: ["Eternal", "Fleeting", "Sturdy", "Hidden", "Frequent"],
    answer: 1,
    why: "Ephemeral means lasting for a very short time, which is what fleeting means.",
  },
  {
    id: "v11",
    cat: "verbal",
    prompt:
      "The manager's instructions were so ______ that no two team members interpreted them the same way.",
    options: ["precise", "ambiguous", "lengthy", "courteous", "formal"],
    answer: 1,
    why: "Instructions that produce different interpretations are open to more than one reading, which is what ambiguous means.",
  },
  {
    id: "v12",
    cat: "verbal",
    prompt: "Which word does not belong with the others?",
    options: ["Kilogram", "Litre", "Metre", "Second", "Weight"],
    answer: 4,
    why: "The others are units of measurement. Weight is the quantity being measured, not a unit.",
  },
  {
    id: "v13",
    cat: "verbal",
    prompt:
      "No compilers written in Rust are slow. Some tools in the pipeline are slow. Which statement must be true?",
    options: [
      "Every tool in the pipeline is written in Rust",
      "Some tools in the pipeline are not compilers written in Rust",
      "No tool in the pipeline is a compiler",
      "Some compilers written in Rust are in the pipeline",
      "Every slow tool is a compiler",
    ],
    answer: 1,
    why: "The slow tools cannot be Rust compilers, since no Rust compiler is slow. So some pipeline tools are not Rust compilers.",
  },
  {
    id: "v14",
    cat: "verbal",
    prompt: "Cobbler is to shoes as cooper is to:",
    options: ["Barrels", "Bread", "Copper", "Ropes", "Hats"],
    answer: 0,
    why: "Each craftsman is paired with what they make. A cooper makes barrels.",
  },
  {
    id: "v15",
    cat: "verbal",
    prompt: "Which word is most nearly OPPOSITE in meaning to 'tenacious'?",
    options: ["Persistent", "Stubborn", "Yielding", "Determined", "Resolute"],
    answer: 2,
    why: "Tenacious means holding firmly and not giving up. Yielding is the opposite.",
  },
  {
    id: "v16",
    cat: "verbal",
    prompt:
      "Far from ______ the process, the new policy increased the number of forms staff had to complete.",
    options: ["complicating", "simplifying", "delaying", "enforcing", "documenting"],
    answer: 1,
    why: "'Far from X' means the opposite of X happened. More forms is the opposite of simplifying.",
  },
  {
    id: "v17",
    cat: "verbal",
    prompt: "Which word is most similar in meaning to 'candour'?",
    options: ["Deceit", "Frankness", "Warmth", "Caution", "Flattery"],
    answer: 1,
    why: "Candour is the quality of being open and honest, which is frankness.",
  },
  {
    id: "v18",
    cat: "verbal",
    prompt: "Drought is to rain as famine is to:",
    options: ["Hunger", "Food", "Harvest", "Water", "Poverty"],
    answer: 1,
    why: "A drought is a severe shortage of rain; a famine is a severe shortage of food.",
  },
  {
    id: "v19",
    cat: "verbal",
    prompt: "Which word does not belong with the others?",
    options: ["Sprint", "Jog", "Stroll", "Bicycle", "Amble"],
    answer: 3,
    why: "The others are all ways of moving on foot. A bicycle is a machine you ride.",
  },
  {
    id: "v20",
    cat: "verbal",
    prompt:
      "Every server in Rack A has been patched. Server X has not been patched. Which statement must be true?",
    options: [
      "Server X is in Rack A",
      "Server X is not in Rack A",
      "Rack A contains no servers",
      "Some servers in Rack A are unpatched",
      "Server X is faulty",
    ],
    answer: 1,
    why: "If everything in Rack A is patched and Server X is not patched, Server X cannot be in Rack A.",
  },
  {
    id: "v21",
    cat: "verbal",
    prompt: "Which word is most nearly OPPOSITE in meaning to 'obscure'?",
    options: ["Vague", "Cryptic", "Evident", "Dim", "Remote"],
    answer: 2,
    why: "Obscure means unclear or hard to make out. Evident, meaning plain to see, is its opposite.",
  },
  {
    id: "v22",
    cat: "verbal",
    prompt:
      "The witness's account was ______: she recalled the number plate, the time and even the colour of the driver's scarf.",
    options: ["vague", "detailed", "reluctant", "rehearsed", "brief"],
    answer: 1,
    why: "The examples after the colon are small specifics, so the account was detailed.",
  },
  {
    id: "v23",
    cat: "verbal",
    prompt: "Chapter is to novel as movement is to:",
    options: ["Dance", "Symphony", "Poem", "Sculpture", "Orchestra"],
    answer: 1,
    why: "A chapter is a named section of a novel; a movement is a named section of a symphony.",
  },
  {
    id: "v24",
    cat: "verbal",
    prompt: "Which word is most similar in meaning to 'mitigate'?",
    options: ["Aggravate", "Alleviate", "Ignore", "Predict", "Confirm"],
    answer: 1,
    why: "To mitigate is to make something less severe, which is what alleviate means.",
  },
  {
    id: "v25",
    cat: "verbal",
    prompt: "Frigid is to cold as furious is to:",
    options: ["Calm", "Annoyed", "Angry", "Sad", "Cheerful"],
    answer: 2,
    why: "Frigid is an extreme form of cold; furious is an extreme form of angry.",
  },
];

/* ---------------- maths & logic bank ---------------- */

const MATHS = [
  {
    id: "m1",
    cat: "maths",
    prompt: "What number comes next?  4, 7, 13, 22, 34, ?",
    options: ["46", "47", "49", "51", "52"],
    answer: 2,
    why: "The gaps are 3, 6, 9, 12, so the next gap is 15: 34 + 15 = 49.",
  },
  {
    id: "m2",
    cat: "maths",
    prompt:
      "A jacket priced at £80 is reduced by 25%, then a further 10% is taken off the reduced price. What is the final price?",
    options: ["£52", "£54", "£55", "£56", "£58"],
    answer: 1,
    why: "£80 × 0.75 = £60, then £60 × 0.9 = £54.",
  },
  {
    id: "m3",
    cat: "maths",
    prompt:
      "4 printers print 240 pages in 6 minutes. At the same rate, how many pages do 6 printers print in 4 minutes?",
    options: ["160", "200", "240", "300", "360"],
    answer: 2,
    why: "One printer prints 240 ÷ 4 = 60 pages in 6 minutes, so 10 pages a minute. 6 printers × 4 minutes × 10 = 240.",
  },
  {
    id: "m4",
    cat: "maths",
    prompt: "What number comes next?  2, 6, 12, 20, 30, ?",
    options: ["36", "40", "42", "44", "46"],
    answer: 2,
    why: "The gaps are 4, 6, 8, 10, so the next gap is 12: 30 + 12 = 42.",
  },
  {
    id: "m5",
    cat: "maths",
    prompt:
      "A train covers 180 km in 2 hours 15 minutes. What is its average speed in km/h?",
    options: ["72", "75", "80", "82", "90"],
    answer: 2,
    why: "2 hours 15 minutes is 2.25 hours, and 180 ÷ 2.25 = 80.",
  },
  {
    id: "m6",
    cat: "maths",
    prompt: "£4,500 is split between Ana and Ben in the ratio 4:5. How much does Ben receive?",
    options: ["£2,000", "£2,250", "£2,500", "£2,700", "£2,800"],
    answer: 2,
    why: "There are 9 parts, so one part is £500. Ben's 5 parts come to £2,500.",
  },
  {
    id: "m7",
    cat: "maths",
    prompt: "A number increased by 20% gives 96. What was the original number?",
    options: ["76", "78", "80", "84", "86"],
    answer: 2,
    why: "The 96 already contains the extra 20%, so divide rather than subtract: 96 ÷ 1.2 = 80.",
  },
  {
    id: "m8",
    cat: "maths",
    prompt: "What number comes next?  81, 27, 9, 3, ?",
    options: ["0", "1", "1.5", "2", "3"],
    answer: 1,
    why: "Each term is divided by 3, and 3 ÷ 3 = 1.",
  },
  {
    id: "m9",
    cat: "maths",
    prompt:
      "Three people can paint a fence in 6 hours. Working at the same rate, how long would 4 people take?",
    options: ["4 hours", "4 hours 30 minutes", "5 hours", "5 hours 30 minutes", "8 hours"],
    answer: 1,
    why: "The job takes 18 person-hours. Shared between 4 people that is 4.5 hours.",
  },
  {
    id: "m10",
    cat: "maths",
    prompt:
      "The average of five numbers is 14. Four of them are 10, 12, 16 and 18. What is the fifth?",
    options: ["12", "13", "14", "15", "16"],
    answer: 2,
    why: "The five must total 70. The four given add to 56, leaving 14.",
  },
  {
    id: "m11",
    cat: "maths",
    prompt: "In a queue of 20 people, Ravi is 7th from the front. What position is he from the back?",
    options: ["12th", "13th", "14th", "15th", "16th"],
    answer: 2,
    why: "20 − 7 + 1 = 14.",
  },
  {
    id: "m12",
    cat: "maths",
    prompt: "What number comes next?  1, 4, 9, 16, 25, ?",
    options: ["30", "32", "34", "36", "49"],
    answer: 3,
    why: "These are the square numbers, and 6² = 36.",
  },
  {
    id: "m13",
    cat: "maths",
    prompt:
      "A bag holds 4 red counters and 6 blue counters. One is drawn at random. What is the probability it is red?",
    options: ["1/4", "1/3", "2/5", "1/2", "3/5"],
    answer: 2,
    why: "4 red out of 10 counters is 4/10, which simplifies to 2/5.",
  },
  {
    id: "m14",
    cat: "maths",
    prompt: "A shop buys an item for £40 and sells it for £52. What is the percentage profit?",
    options: ["12%", "20%", "23%", "30%", "32%"],
    answer: 3,
    why: "The profit is £12 on a £40 cost, and 12 ÷ 40 = 30%.",
  },
  {
    id: "m15",
    cat: "maths",
    prompt: "What number comes next?  5, 10, 8, 16, 14, 28, ?",
    options: ["24", "26", "30", "32", "56"],
    answer: 1,
    why: "The rule alternates: double, then subtract 2. After doubling to 28, subtract 2 to get 26.",
  },
  {
    id: "m16",
    cat: "maths",
    prompt: "If x + 3 = 2x − 5, what is x?",
    options: ["2", "4", "6", "8", "10"],
    answer: 3,
    why: "Subtract x from both sides to get 3 = x − 5, so x = 8.",
  },
  {
    id: "m17",
    cat: "maths",
    prompt: "A meeting starts at 14:40 and runs for 95 minutes. When does it end?",
    options: ["16:05", "16:15", "16:25", "16:35", "17:15"],
    answer: 1,
    why: "95 minutes is 1 hour 35 minutes, and 14:40 plus that is 16:15.",
  },
  {
    id: "m18",
    cat: "maths",
    prompt: "Which of these is the largest?",
    options: ["0.6", "5/8", "62%", "3/5", "0.605"],
    answer: 1,
    why: "As decimals: 0.600, 0.625, 0.620, 0.600, 0.605. The largest is 5/8.",
  },
  {
    id: "m19",
    cat: "maths",
    prompt: "A printer produces 24 pages per minute. How many pages does it produce in 3.5 minutes?",
    options: ["72", "78", "84", "88", "96"],
    answer: 2,
    why: "Multiply the rate by the time: 24 × 3.5 = 84 pages.",
  },
  {
    id: "m20",
    cat: "maths",
    prompt:
      "Every box on the top shelf is blue. Some blue boxes are empty. Which statement must be true?",
    options: [
      "Some boxes on the top shelf are empty",
      "Every blue box is on the top shelf",
      "No box on the top shelf is empty",
      "Some empty boxes are blue",
      "Every empty box is blue",
    ],
    answer: 3,
    why: "That is simply the second statement restated. Nothing tells us whether the empty blue boxes are the shelf ones.",
  },
  {
    id: "m21",
    cat: "maths",
    prompt: "What number comes next?  7, 14, 28, 56, ?",
    options: ["84", "96", "102", "112", "128"],
    answer: 3,
    why: "Each term doubles, and 56 × 2 = 112.",
  },
  {
    id: "m22",
    cat: "maths",
    prompt: "Sales fell from 250 units to 200 units. What is the percentage decrease?",
    options: ["15%", "20%", "25%", "30%", "33%"],
    answer: 1,
    why: "The fall is 50 from a starting point of 250, and 50 ÷ 250 = 20%.",
  },
  {
    id: "m23",
    cat: "maths",
    prompt: "A recipe for 6 people needs 450 g of rice. How much rice is needed for 10 people?",
    options: ["600 g", "700 g", "750 g", "800 g", "900 g"],
    answer: 2,
    why: "That is 75 g per person, and 75 × 10 = 750 g.",
  },
  {
    id: "m24",
    cat: "maths",
    prompt: "The sum of three consecutive even numbers is 66. What is the largest of them?",
    options: ["20", "22", "24", "26", "28"],
    answer: 2,
    why: "The middle number is 66 ÷ 3 = 22, so the three are 20, 22 and 24.",
  },
  {
    id: "m25",
    cat: "maths",
    prompt: "What number comes next?  2, 9, 4, 12, 6, 15, 8, ?",
    options: ["10", "16", "17", "18", "20"],
    answer: 3,
    why: "Two sequences alternate: 2, 4, 6, 8 rising by 2, and 9, 12, 15 rising by 3. Next in the second is 18.",
  },
];

/* ---------------- how-to-solve guidance ----------------
   Shape: rows = the working, shown as chips. steps = at most three
   short lines. trap = the answer they wanted you to pick.
   ------------------------------------------------------ */

const STRATEGY = {
  antonym: {
    name: "Opposites",
    method: ["Define the word yourself first.", "Want the reverse, not just something negative.", "One option is a synonym. It is bait."],
    example: "BRIGHTEN = make lighter, so want DARKEN.",
  },
  synonym: {
    name: "Closest meaning",
    method: ["Say it in a phrase you have heard.", "Cut the opposite, then the unrelated.", "Pick the closest, not the loosely related."],
    example: "'A prudent decision' = careful with risk = cautious.",
  },
  analogy: {
    name: "Word pairs",
    method: ["Say the link as a short sentence.", "Read it back with the third word.", "Two fit? Your sentence was too vague."],
    example: "Pen is the tool a writer uses. Brush, painter.",
  },
  completion: {
    name: "Sentence completion",
    method: ["Find the joining word first.", "Although, far from = clash. Because, so = agree.", "Predict your own word, then match it."],
    example: "'Because the brief was ___, nobody asked questions.' Predict: clear.",
  },
  oddword: {
    name: "Odd word out",
    method: ["Find the group of four, not the odd one.", "Usual splits: species vs category, unit vs quantity, verb vs noun."],
    example: "Sparrow, robin, wren, bird, finch. Four species, one category.",
  },
  deduction: {
    name: "Must-be-true",
    method: ["Accept only what is forced.", "All A are B puts A inside the bigger B circle.", "Inside B does not put you in A."],
    example: "All surgeons are doctors. Sam is a doctor. Sam may or may not be.",
  },
  series: {
    name: "Number series",
    method: ["Write the gaps underneath.", "Gaps not constant? Look at the gaps of the gaps.", "Growing fast? Try ratios.", "Zigzag? Two rules, or two woven sequences."],
    trick: ["Check in this order: gaps, gaps-of-gaps, ratios, alternating, squares.", "Nine in ten fall to the first two."],
    example: "4, 7, 13, 25. Gaps 3, 6, 12 double. Next gap 24, so 49.",
  },
  percent: {
    name: "Percentages",
    method: ["Build from 10% and halves.", "Successive discounts: one then the other, never added.", "Undoing a rise means dividing."],
    trick: ["10% = one decimal place. 5% = half of that. 20% = double it.", "25% = halve twice. 15% = 10% + 5%.", "Undo a 20% rise: divide by 6, times 5."],
    example: "18% of 250 = 25 + 12.5 + 5 + 2.5 = 45.",
  },
  pctchange: {
    name: "Percentage change",
    method: ["Change divided by where you started.", "The starting figure is what people get wrong.", "Turn it into a fraction you know."],
    trick: ["1/2 = 50%, 1/3 = 33%, 1/4 = 25%, 1/5 = 20%, 1/8 = 12.5%."],
    example: "80 down to 60. 20/80 = 1/4 = 25% fall.",
  },
  ratio: {
    name: "Ratios and sharing",
    method: ["Add the parts to get the number of shares.", "Divide to find one share.", "Multiply up, then check it adds back."],
    trick: ["Scale to one unit first. Per-person figures make the rest trivial."],
    example: "£60 split 1:2:3 = 6 shares of £10.",
  },
  average: {
    name: "Averages",
    method: ["Average times count gives the total.", "Subtract what you know.", "Evenly spaced? The middle one is the average."],
    trick: ["Average × count = total. That one line solves nearly all of them."],
    example: "Four numbers average 20, so total 80. Three make 55, so the fourth is 25.",
  },
  rate: {
    name: "Rates and speed",
    method: ["Convert minutes to a fraction of an hour first.", "Dividing by a fraction = multiplying by it upside down.", "Split awkward multipliers."],
    trick: ["2h15 = 9/4. 1h20 = 4/3. 45 min = 3/4.", "×3.5 means three of it plus half of it."],
    example: "150 km in 3/2 hours = 150 × 2/3 = 100 km/h.",
  },
  work: {
    name: "Work rate",
    method: ["Turn the job into person-hours.", "Share that total across the new headcount.", "More people means less time. Cross off options first."],
    trick: ["Working side by side does not change how long one unit takes."],
    example: "2 people, 9 hours = 18 person-hours. 6 people take 3.",
  },
  algebra: {
    name: "Simple equations",
    method: ["Unknowns one side, numbers the other.", "Same operation to both sides.", "Substitute back to check."],
    trick: ["Five options in front of you: testing beats solving.", "Start with the middle value and halve the search."],
    example: "3x − 4 = 11, so 3x = 15, x = 5.",
  },
  probability: {
    name: "Probability",
    method: ["What you want over everything there is.", "The bottom is the full total, not the other group.", "Simplify, then match the option format."],
    trick: ["Always between 0 and 1. Over a half should feel like most of them."],
    example: "3 green in 12 = 3/12 = 1/4.",
  },
  compare: {
    name: "Comparing values",
    method: ["Put everything in the same form.", "Same number of decimal places, then read left to right."],
    trick: ["1/8 = 0.125, 1/4 = 0.25, 1/3 = 0.333, 3/8 = 0.375", "5/8 = 0.625, 2/3 = 0.667, 7/8 = 0.875"],
    example: "5/8 = 0.5 + 0.125 = 0.625, so bigger than 0.6.",
  },
  clock: {
    name: "Time arithmetic",
    method: ["Split into whole hours plus leftover minutes.", "Add the hour, then walk up to the next o'clock.", "40 + 35 is 1h15, not 75."],
    trick: ["Use the next o'clock as a staging post. It removes the carrying errors."],
    example: "09:50 + 40 min: 10 gets you to 10:00, then 30 more.",
  },
  position: {
    name: "Counting positions",
    method: ["Front plus back equals total plus one.", "The plus one is because you count the person twice.", "Test any rule on a queue of three."],
    trick: ["Front + back = total + 1. Every off-by-one comes from forgetting it."],
    example: "Line of 12, 5th from front = 12 − 5 + 1 = 8th from back.",
  },
  rotation: {
    name: "Rotation sequences",
    method: ["Pick one landmark and follow only that.", "Measure the turn on the first pair, confirm on the second.", "Check direction as well as size."],
    example: "A quarter turn clockwise moves a top landmark to the right.",
  },
  mirror: {
    name: "Mirror or rotation",
    method: ["A turn keeps handedness. A flip reverses it.", "Ask which side your landmark sits on.", "Spin it flat on an imaginary table."],
    example: "Your two hands are the same shape. No turn makes one into the other.",
  },
  figanalogy: {
    name: "Figure analogies",
    method: ["Name the change before looking at the options.", "Turned how far, flipped, resized, reshaded.", "Apply exactly that to the third figure."],
    example: "First pair turns a quarter clockwise, so the second pair does too.",
  },
  gridmove: {
    name: "Moving grids",
    method: ["Separate what moves from what stays.", "Treat the shaded square as a dot on a loop.", "Corner to edge is one step."],
    example: "Top-left to top-middle to top-right is two steps, not one.",
  },
  gridodd: {
    name: "Odd grid out",
    method: ["Count first. It often ends the question.", "Then spin each grid to line up the block.", "The one that never matches is flipped."],
    example: "Four Ls in different corners, one mirrored L that never lines up.",
  },
  countseries: {
    name: "Counting sequences",
    method: ["Count the thing that changes: sides, dots, lines.", "Adding a fixed amount, or multiplying? They diverge fast."],
    example: "3, 4, 5 sides adds one. 2, 4, 8 dots doubles.",
  },
};

const HOW = {
  v1: { t: "analogy", rows: [R("link", "book", "shown in", "library"), R("same", "painting", "shown in", "gallery")],
        steps: ["Artist, canvas, brush, frame are parts, not places."] },
  v2: { t: "antonym", rows: [R("means", "candid", "says what he thinks"), R("want", "opposite", "evasive")],
        steps: ["Frank, blunt, sincere, direct all match candid."], trap: "Four synonyms, one antonym. Count them." },
  v3: { t: "synonym", rows: [R("means", "meticulous", "checks every detail"), R("match", "painstaking")],
        steps: ["Careless and hasty are the opposites."] },
  v4: { t: "analogy", rows: [R("link", "whisper", "at its most extreme", "shout"), R("same", "trickle", "at its most extreme", "flood")],
        steps: ["Drip, drop and leak are all small, like trickle."], trap: "Stream is bigger but not extreme." },
  v5: { t: "completion", rows: [R("signal", "Although", "the halves clash"), R("half 2", "errors found anyway"), R("so", "half 1 praises it", "thorough")],
        steps: [] },
  v6: { t: "oddword", rows: [R("group", "oak", "maple", "birch", "elm"), R("odd", "shrub", "a plant type, not a species")],
        steps: ["Species against category is the most common split."] },
  v7: { t: "deduction", rows: [R("given", "all bakers", "inside", "rye users"), R("marta", "inside rye users", "trade unknown")],
        steps: ["The bigger circle holds non-bakers too."], trap: "Concluding she is a baker reverses the arrow." },
  v8: { t: "antonym", rows: [R("means", "abundant", "loads of it"), R("want", "scarce")],
        steps: ["Plentiful, ample, copious, lavish all match abundant."] },
  v9: { t: "analogy", rows: [R("link", "thermometer", "measures", "temperature"), R("same", "odometer", "measures", "distance")],
        steps: [], trap: "Speed is the speedometer." },
  v10: { t: "synonym", rows: [R("means", "ephemeral", "lasts a moment"), R("match", "fleeting")],
         steps: [], trap: "Eternal is the planted opposite." },
  v11: { t: "completion", rows: [R("clue", "everyone read it differently"), R("so", "wording takes two meanings", "ambiguous")],
         steps: ["Precise would give the opposite outcome."] },
  v12: { t: "oddword", rows: [R("group", "kilogram", "litre", "metre", "second"), R("odd", "weight", "the quantity, not the unit")],
         steps: [] },
  v13: { t: "deduction", rows: [R("given", "rust compilers", "never", "slow"), R("given", "some tools", "are", "slow"), R("so", "those tools", "are not rust compilers")],
         steps: ["The safe answer is usually the least dramatic."] },
  v14: { t: "analogy", rows: [R("link", "cobbler", "makes", "shoes"), R("same", "cooper", "makes", "barrels")],
         steps: [], trap: "Copper is a sound-alike." },
  v15: { t: "antonym", rows: [R("means", "tenacious", "will not let go"), R("want", "yielding")],
         steps: ["The other four all mean persistent."] },
  v16: { t: "completion", rows: [R("signal", "Far from X", "the opposite of X happened"), R("happened", "more forms"), R("so", "X", "simplifying")],
         steps: [] },
  v17: { t: "synonym", rows: [R("means", "candour", "openness"), R("match", "frankness")],
         steps: ["It is the noun form of candid."] },
  v18: { t: "analogy", rows: [R("link", "drought", "no", "rain"), R("same", "famine", "no", "food")],
         steps: [], trap: "Hunger is the effect, not the missing thing." },
  v19: { t: "oddword", rows: [R("group", "sprint", "jog", "stroll", "amble"), R("odd", "bicycle", "a machine, and a noun")],
         steps: [] },
  v20: { t: "deduction", rows: [R("rule", "in Rack A", "then", "patched"), R("fact", "X", "not patched"), R("so", "X", "not in Rack A")],
         steps: ["Flip the rule and negate both halves. Always valid."] },
  v21: { t: "antonym", rows: [R("means", "obscure", "hard to make out"), R("want", "evident")],
         steps: ["Vague, cryptic, dim, remote all lean the same way."] },
  v22: { t: "completion", rows: [R("clue", "number plate", "time", "scarf colour"), R("so", "detailed")],
         steps: ["After a colon, the second half is your evidence."] },
  v23: { t: "analogy", rows: [R("link", "chapter", "part of a", "novel"), R("same", "movement", "part of a", "symphony")],
         steps: [], trap: "The orchestra plays it, it is not a part of it." },
  v24: { t: "synonym", rows: [R("means", "mitigate", "take the edge off"), R("match", "alleviate")],
         steps: ["Think mitigating circumstances, mitigating risk."], trap: "Aggravate is the exact opposite." },
  v25: { t: "analogy", rows: [R("link", "frigid", "extreme", "cold"), R("same", "furious", "extreme", "angry")],
         steps: [], trap: "Annoyed is milder, so it runs the wrong way." },

  m1: { t: "series", rows: [R("gaps", "3", "6", "9", "12", "15"), R("add", "34 + 15", "49")],
        steps: ["Write the gaps first. Here they climb by 3 each time."], trap: "46 repeats the last gap instead of growing it." },
  m2: { t: "percent", rows: [R("25% off", "80", "− 20", "60"), R("10% off", "60", "− 6", "54")],
        steps: ["Quarter of 80 is 20. Tenth of 60 is 6."], trap: "£52 is 35% off in one go. Never add discounts." },
  m3: { t: "work", rows: [R("one", "1 printer", "1 minute", "10 pages"), R("many", "6 printers", "4 minutes", "240")],
        steps: ["Find what one printer does in one minute first."], trap: "360 scales up for the extra printers but forgets the shorter time." },
  m4: { t: "series", rows: [R("gaps", "4", "6", "8", "10", "12"), R("add", "30 + 12", "42")],
        steps: [] },
  m5: { t: "rate", rows: [R("time", "2h 15", "9/4 h"), R("speed", "180 × 4/9", "80")],
        steps: ["Dividing by 9/4 is multiplying by 4/9."] },
  m6: { t: "ratio", rows: [R("parts", "4 + 5", "9"), R("one", "4500 ÷ 9", "500"), R("ben", "5 × 500", "2500")],
        steps: [] },
  m7: { t: "percent", rows: [R("means", "96", "120%", "6/5"), R("undo", "96 ÷ 6 = 16", "16 × 5", "80")],
        steps: ["The bigger number is given, so divide."], trap: "20% off 96 is a different sum." },
  m8: { t: "series", rows: [R("ratio", "81", "27", "9", "3", "÷ 3"), R("next", "3 ÷ 3", "1")],
        steps: ["Shrinking fast means test division."] },
  m9: { t: "work", rows: [R("job", "3 × 6", "18 person-hours"), R("split", "18 ÷ 4", "4.5 h")],
        steps: ["More people means less time. That kills two options."] },
  m10: { t: "average", rows: [R("total", "14 × 5", "70"), R("known", "10+12+16+18", "56"), R("gap", "70 − 56", "14")],
         steps: [] },
  m11: { t: "position", rows: [R("rule", "front + back", "total + 1"), R("so", "20 − 7 + 1", "14")],
         steps: [] },
  m12: { t: "series", rows: [R("squares", "1²", "2²", "3²", "4²", "5²"), R("next", "6²", "36")],
         steps: ["Gaps 3, 5, 7, 9 give the same answer."] },
  m13: { t: "probability", rows: [R("count", "4 red", "10 total"), R("simplify", "4/10", "2/5")],
         steps: [] },
  m14: { t: "pctchange", rows: [R("profit", "52 − 40", "12"), R("on cost", "12 / 40", "30%")],
         steps: ["Profit is measured against what you paid."] },
  m15: { t: "series", rows: [R("rules", "×2", "−2", "×2", "−2", "×2"), R("next", "28 − 2", "26")],
         steps: ["Up then down means two rules taking turns."] },
  m16: { t: "algebra", rows: [R("tidy", "x + 3 = 2x − 5", "3 = x − 5"), R("solve", "x", "8")],
         steps: ["Check: 11 = 11."] },
  m17: { t: "clock", rows: [R("split", "95 min", "1h 35"), R("add", "14:40", "15:40", "16:15")],
         steps: [] },
  m18: { t: "compare", rows: [R("decimals", "0.600", "0.625", "0.620", "0.600", "0.605"), R("biggest", "5/8", "0.625")],
         steps: ["5/8 is 0.5 plus 0.125."] },
  m19: { t: "rate", rows: [R("split", "3.5", "3 + a half"), R("add", "72 + 12", "84")],
         steps: [] },
  m20: { t: "deduction", rows: [R("given", "some blue boxes", "are empty"), R("reverse", "some empty boxes", "are blue")],
         steps: ["The same fact stated backwards must be true."], trap: "Top-shelf boxes being empty is not forced." },
  m21: { t: "series", rows: [R("ratio", "×2 each time"), R("next", "56 × 2", "112")],
         steps: ["Double in pieces: 50 to 100, 6 to 12."] },
  m22: { t: "pctchange", rows: [R("change", "250 → 200", "50"), R("on start", "50 / 250", "20%")],
         steps: [], trap: "25% comes from dividing by 200." },
  m23: { t: "ratio", rows: [R("per head", "450 ÷ 6", "75 g"), R("scale", "75 × 10", "750 g")],
         steps: [] },
  m24: { t: "average", rows: [R("middle", "66 ÷ 3", "22"), R("so", "20", "22", "24")],
         steps: ["In an evenly spaced run the middle is the average."] },
  m25: { t: "series", rows: [R("1st 3rd 5th", "2", "4", "6", "8"), R("2nd 4th 6th", "9", "12", "15", "18")],
         steps: ["Zigzag usually means two sequences woven together."] },
};

const BANK = [...VERBAL, ...MATHS, ...SPATIAL];

/* ---------------- test assembly ---------------- */

let lastPaper = new Set();

// Prefer questions that were not on the previous paper, so back-to-back
// attempts overlap as little as the bank size allows.
function pickFresh(pool, n) {
  const unseen = shuffle(pool.filter((q) => !lastPaper.has(q.id)));
  const seen = shuffle(pool.filter((q) => lastPaper.has(q.id)));
  return [...unseen, ...seen].slice(0, n);
}

function buildTest() {
  const picked = [
    ...pickFresh(BANK.filter((q) => q.cat === "verbal"), PICK.verbal),
    ...pickFresh(BANK.filter((q) => q.cat === "maths"), PICK.maths),
    ...pickFresh(BANK.filter((q) => q.cat === "spatial"), PICK.spatial),
  ];
  lastPaper = new Set(picked.map((q) => q.id));
  return shuffle(picked).map((q) => {
    const order = shuffle(q.options.map((_, i) => i));
    return {
      ...q,
      options: order.map((i) => q.options[i]),
      answer: order.indexOf(q.answer),
    };
  });
}

const guideFor = (q) => {
  const g = q.rows ? { t: q.t, rows: q.rows, steps: q.steps, trap: q.trap } : HOW[q.id];
  if (!g || !STRATEGY[g.t]) return null;
  return { rows: g.rows || [], steps: g.steps || [], trap: g.trap, s: STRATEGY[g.t] };
};

const fmt = (s) =>
  `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

/* ---------------- screens ---------------- */

function Intro({ onStart }) {
  const [mode, setMode] = useState("exam");
  const [auto, setAuto] = useState(true);
  const [oneWay, setOneWay] = useState(true);
  const [minsText, setMinsText] = useState("24");
  const [untimed, setUntimed] = useState(false);
  const parsed = parseMinutes(minsText);
  const validMins = parsed !== null;
  const mins = parsed === null ? 24 : parsed;
  const perQ = ((mins * 60) / QUESTION_COUNT).toFixed(1);
  const bump = (d) => setMinsText(String(clampMins(mins + d)));
  const ready = untimed || validMins;
  const modes = [
    {
      k: "exam",
      title: "Exam mode",
      body: "No feedback until the end. Closest to the real thing.",
    },
    {
      k: "instant",
      title: "Instant feedback",
      body: "Each answer is marked as you go, with a short explanation.",
    },
  ];
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 px-5 py-10 flex justify-center">
      <div className="w-full max-w-xl">
        <p className="font-mono text-xs tracking-widest text-sky-400 uppercase">
          Aptitude practice
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Aptitude Training
        </h1>
        <p className="mt-3 text-slate-400 leading-relaxed">
          50 questions. Verbal, maths &amp; logic and spatial questions are mixed
          through the paper in random order, and each run pulls the freshest
          selection it can from a bank of 75.
        </p>

        <div className="mt-7">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
              Minutes on the clock
            </p>
            <button
              onClick={() => setUntimed(!untimed)}
              className={`rounded-md border px-2 py-1 font-mono text-xs ${
                untimed
                  ? "border-sky-400 bg-sky-900 text-sky-100"
                  : "border-slate-700 text-slate-500 hover:border-slate-500"
              }`}
            >
              no clock
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => bump(-1)}
              disabled={untimed}
              aria-label="One minute less"
              className="h-14 w-14 shrink-0 rounded-lg border border-slate-700 bg-slate-800 font-mono text-xl text-slate-300 hover:border-slate-500 disabled:opacity-30"
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              step={1}
              value={untimed ? "" : minsText}
              disabled={untimed}
              placeholder="--"
              aria-label="Minutes on the clock"
              onChange={(e) => setMinsText(e.target.value)}
              onBlur={() => setMinsText(String(mins))}
              className="h-14 w-full rounded-lg border border-slate-700 bg-slate-800 text-center font-mono text-2xl tabular-nums text-slate-100 focus:border-sky-400 focus:outline-none disabled:opacity-40"
            />
            <button
              onClick={() => bump(1)}
              disabled={untimed}
              aria-label="One minute more"
              className="h-14 w-14 shrink-0 rounded-lg border border-slate-700 bg-slate-800 font-mono text-xl text-slate-300 hover:border-slate-500 disabled:opacity-30"
            >
              +
            </button>
          </div>

          <p className={`mt-2 text-sm ${ready ? "text-slate-400" : "text-rose-400"}`}>
            {untimed
              ? "No clock. The timer counts up and nothing auto-submits."
              : validMins
              ? `${perQ}s a question across all 50`
              : `Enter a whole number from ${MIN_MINUTES} to ${MAX_MINUTES}`}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            A common standard is 15 minutes, which is 18.0s a question.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          {modes.map((m) => {
            const on = mode === m.k;
            return (
              <button
                key={m.k}
                onClick={() => setMode(m.k)}
                className={`w-full text-left rounded-xl border p-4 transition-colors ${
                  on
                    ? "border-sky-400 bg-sky-900"
                    : "border-slate-700 bg-slate-800 hover:border-slate-500"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{m.title}</span>
                  <span
                    className={`h-4 w-4 rounded-full border-2 ${
                      on ? "border-sky-400 bg-sky-400" : "border-slate-600"
                    }`}
                  />
                </div>
                <p className="mt-1 text-sm text-slate-400">{m.body}</p>
              </button>
            );
          })}
        </div>

        {[
          {
            on: oneWay,
            set: () => setOneWay(!oneWay),
            title: "One-way",
            body: "No going back once you leave a question. Many timed tests work this way.",
          },
          {
            on: auto,
            set: () => setAuto(!auto),
            title: "Move on automatically",
            body: "Jumps to the next question the moment you pick an answer.",
          },
        ].map((t) => (
          <button
            key={t.title}
            onClick={t.set}
            className="mt-3 flex w-full items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-left hover:border-slate-500"
          >
            <span
              className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${
                t.on ? "bg-sky-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                  t.on ? "translate-x-4" : ""
                }`}
              />
            </span>
            <span className="text-sm">
              <span className="font-medium">{t.title}</span>
              <span className="block text-slate-400">{t.body}</span>
            </span>
          </button>
        ))}

        <details className="mt-6 rounded-xl border border-slate-700 bg-slate-800 p-4">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-sky-400">
            Rules on the day
          </summary>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300">
            <li>
              <span className="font-medium">Calculator and paper: check your invitation.</span>{" "}
              Some tests ban calculators, others expect one. The maths here is built to be
              done by hand or in your head.
            </li>
            <li>
              <span className="font-medium">No penalty for a wrong answer.</span> Never leave one
              blank. A guess is free.
            </li>
            <li>
              <span className="font-medium">Reading the instructions is usually not timed.</span>{" "}
              Take as long as you need before the questions start.
            </li>
            <li>
              <span className="font-medium">You may not be able to go back.</span> Practise
              one-way and you cannot be caught out.
            </li>
            <li>
              <span className="font-medium">Few people finish.</span> Short mixed tests are built
              so that almost nobody answers every question. Keep moving.
            </li>
          </ul>
        </details>

        <button
          disabled={!ready}
          onClick={() =>
            onStart({ mode, auto, oneWay, seconds: untimed ? 0 : mins * 60 })
          }
          className="mt-8 w-full rounded-xl bg-sky-500 py-4 text-base font-semibold text-slate-900 hover:bg-sky-400 disabled:opacity-40"
        >
          {untimed ? "Start without a clock" : `Start the ${mins}-minute test`}
        </button>

        <p className="mt-6 text-xs leading-relaxed text-slate-500">
          These are original practice questions, not items from any real test. The header tracks
          your running average and whether you are ahead of or behind the budget for
          the clock you picked, and the result breaks the time down question by
          question. Nothing is saved: closing this resets the attempt. Keyboard: A–E or
          1–5 to answer, arrow keys to move, F to flag.
        </p>
      </div>
    </div>
  );
}

function Ticks({ n, answers, flags, current }) {
  return (
    <div className="flex gap-px">
      {Array.from({ length: n }).map((_, i) => {
        let cls = "bg-slate-700";
        if (answers[i] != null) cls = "bg-sky-500";
        if (flags[i]) cls = "bg-amber-400";
        if (i === current) cls = "bg-slate-100";
        return <span key={i} className={`h-2 flex-1 rounded-sm ${cls}`} />;
      })}
    </div>
  );
}

function StemRow({ stem }) {
  if (!stem) return null;
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-100">
      {stem.map((it, i) => (
        <div key={i} className="flex items-center justify-center">
          <Visual item={it} size={62} />
        </div>
      ))}
    </div>
  );
}

function OptionButton({ opt, letter, state, onClick, disabled }) {
  const visual = typeof opt === "object";
  const base =
    "relative rounded-xl border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400";
  const tone =
    state === "correct"
      ? "border-emerald-400 bg-emerald-900 text-emerald-100"
      : state === "wrong"
      ? "border-rose-400 bg-rose-900 text-rose-100"
      : state === "chosen"
      ? "border-sky-400 bg-sky-900 text-slate-50"
      : "border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-500";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${tone} ${visual ? "flex flex-col items-center gap-2" : "flex items-center gap-3"}`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs ${
          state === "correct"
            ? "bg-emerald-400 text-emerald-900"
            : state === "wrong"
            ? "bg-rose-400 text-rose-900"
            : state === "chosen"
            ? "bg-sky-400 text-sky-900"
            : "bg-slate-700 text-slate-400"
        }`}
      >
        {letter}
      </span>
      {visual ? <Visual item={opt} size={62} /> : <span className="text-base leading-snug">{opt}</span>}
    </button>
  );
}

function Test({ config, questions, onFinish }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState(() => Array(questions.length).fill(null));
  const [flags, setFlags] = useState(() => Array(questions.length).fill(false));
  const [elapsed, setElapsed] = useState(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [spent, setSpent] = useState(() => Array(questions.length).fill(0));
  const total = config.seconds;
  const timed = total > 0;
  const budget = timed ? total / questions.length : 0;
  const left = timed ? Math.max(0, total - elapsed) : 0;
  const started = useRef(Date.now());
  const entered = useRef(Date.now());
  const done = useRef(false);

  const q = questions[i];
  const locked = (config.mode === "instant" || config.oneWay) && answers[i] != null;

  // Bank the time spent on the question being left, then move.
  const goTo = (next) => {
    const target = Math.max(0, Math.min(questions.length - 1, next));
    if (target === i) return;
    if (config.oneWay && target < i) return;
    const now = Date.now();
    setSpent((s) => {
      const c = [...s];
      c[i] += now - entered.current;
      return c;
    });
    entered.current = now;
    setI(target);
  };

  const endTest = () => {
    if (done.current) return;
    done.current = true;
    const finalSpent = [...spent];
    finalSpent[i] += Date.now() - entered.current;
    onFinish({
      answers,
      flags,
      spent: finalSpent,
      used: timed ? Math.min(elapsed, total) : elapsed,
      total,
      budget,
    });
  };

  useEffect(() => {
    const t = setInterval(
      () => setElapsed(Math.floor((Date.now() - started.current) / 1000)),
      250
    );
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (timed && elapsed >= total) endTest();
  }, [elapsed]);

  const choose = (k) => {
    if (locked) return;
    const next = [...answers];
    next[i] = k;
    setAnswers(next);
    if (config.auto && config.mode !== "instant" && i < questions.length - 1) {
      setTimeout(() => goTo(i + 1), 160);
    }
  };

  const toggleFlag = () => {
    const next = [...flags];
    next[i] = !next[i];
    setFlags(next);
  };

  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      const li = LETTERS.map((l) => l.toLowerCase()).indexOf(k);
      const ni = ["1", "2", "3", "4", "5"].indexOf(k);
      if (li >= 0 && li < q.options.length) choose(li);
      else if (ni >= 0 && ni < q.options.length) choose(ni);
      else if (k === "arrowright" || k === "enter") goTo(i + 1);
      else if (k === "arrowleft") goTo(i - 1);
      else if (k === "f") toggleFlag();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const timerTone = !timed
    ? "text-slate-300"
    : left <= 60
    ? "text-rose-400"
    : left <= 300
    ? "text-amber-400"
    : "text-slate-100";
  const pct = timed
    ? Math.max(0, Math.min(100, (left / total) * 100))
    : ((i + 1) / questions.length) * 100;
  const answered = answers.filter((a) => a != null).length;
  const avgSoFar = i > 0 ? Math.round(elapsed / i) : 0;
  const deltaQ = timed ? i - Math.floor(elapsed / budget) : 0;
  const paceLabel =
    deltaQ >= 1 ? `${deltaQ} ahead` : deltaQ <= -1 ? `${-deltaQ} behind` : "on pace";
  const paceTone =
    deltaQ >= 0 ? "text-emerald-400" : deltaQ >= -3 ? "text-amber-400" : "text-rose-400";

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-700 bg-slate-900 px-4 pt-3 pb-2">
        <div className="mx-auto w-full max-w-2xl">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-mono text-xs tracking-widest text-slate-500 uppercase">
                {CAT_LABEL[q.cat]}
              </p>
              <p className="font-mono text-sm text-slate-300">
                {String(i + 1).padStart(2, "0")}
                <span className="text-slate-500"> / {questions.length}</span>
              </p>
            </div>
            <div className="text-right">
              <p className={`font-mono text-3xl tabular-nums leading-none ${timerTone}`}>
                {fmt(timed ? left : elapsed)}
              </p>
              <p className="mt-1 font-mono text-xs">
                <span className="text-slate-500">
                  avg {i > 0 ? `${avgSoFar}s` : "--"}
                </span>
                {timed && <span className={paceTone}> · {paceLabel}</span>}
              </p>
            </div>
          </div>
          <div className="mt-2 h-1 w-full rounded-full bg-slate-700">
            <div
              className={`h-1 rounded-full ${
                !timed
                  ? "bg-slate-500"
                  : left <= 60
                  ? "bg-rose-400"
                  : left <= 300
                  ? "bg-amber-400"
                  : "bg-sky-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2">
            <Ticks n={questions.length} answers={answers} flags={flags} current={i} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-40 pt-5">
        <h2 className="text-lg leading-snug font-medium">{q.prompt}</h2>
        <StemRow stem={q.stem} />

        <div
          className={`mt-5 grid gap-2 ${
            typeof q.options[0] === "object" ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-1"
          }`}
        >
          {q.options.map((opt, k) => {
            let state = answers[i] === k ? "chosen" : "idle";
            if (config.mode === "instant" && answers[i] != null) {
              if (k === q.answer) state = "correct";
              else if (k === answers[i]) state = "wrong";
              else state = "idle";
            }
            return (
              <OptionButton
                key={k}
                opt={opt}
                letter={LETTERS[k]}
                state={state}
                disabled={locked}
                onClick={() => choose(k)}
              />
            );
          })}
        </div>

        {config.mode === "instant" && answers[i] != null && (
          <div
            className={`mt-4 rounded-xl border p-4 text-sm leading-relaxed ${
              answers[i] === q.answer
                ? "border-emerald-600 bg-emerald-900 text-emerald-100"
                : "border-rose-600 bg-rose-900 text-rose-100"
            }`}
          >
            <p className="font-mono text-xs uppercase tracking-widest opacity-70">
              {answers[i] === q.answer ? "Correct" : `Answer: ${LETTERS[q.answer]}`}
            </p>
            <p className="mt-1">{q.why}</p>
          </div>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-slate-700 bg-slate-900 px-4 py-3">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2">
          {!config.oneWay && (
            <button
              onClick={() => goTo(i - 1)}
              disabled={i === 0}
              className="rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-300 disabled:opacity-30"
            >
              Back
            </button>
          )}
          <button
            onClick={toggleFlag}
            className={`rounded-xl border px-4 py-3 text-sm ${
              flags[i]
                ? "border-amber-400 bg-amber-900 text-amber-200"
                : "border-slate-700 text-slate-300"
            }`}
          >
            {flags[i] ? "Flagged" : "Flag"}
          </button>
          {i < questions.length - 1 ? (
            <button
              onClick={() => goTo(i + 1)}
              className="flex-1 rounded-xl bg-sky-500 py-3 text-sm font-semibold text-slate-900 hover:bg-sky-400"
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => endTest()}
              className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-slate-900 hover:bg-emerald-400"
            >
              Finish and mark
            </button>
          )}
        </div>
        <div className="mx-auto mt-2 w-full max-w-2xl text-center">
          {confirmEnd ? (
            <span className="font-mono text-xs text-slate-400">
              End now with {answered} answered?{" "}
              <button
                onClick={() => endTest()}
                className="text-rose-400 underline"
              >
                Yes, mark it
              </button>{" "}
              ·{" "}
              <button onClick={() => setConfirmEnd(false)} className="text-slate-300 underline">
                Keep going
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmEnd(true)}
              className="font-mono text-xs text-slate-500 hover:text-slate-400"
            >
              End test early
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function PaceChart({ questions, answers, secs, budget }) {
  const max = Math.max(budget > 0 ? budget * 1.4 : 20, ...secs);
  const H = 108;
  const y = (v) => H - (v / max) * H;
  return (
    <svg viewBox="0 0 500 132" className="w-full" style={{ height: 132 }} aria-hidden="true">
      {secs.map((v, i) => {
        const h = Math.max(2, (Math.min(v, max) / max) * H);
        const fill =
          answers[i] == null ? "#475569" : answers[i] === questions[i].answer ? "#34d399" : "#fb7185";
        return <rect key={i} x={i * 10} y={H - h} width="8" height={h} rx="1.5" fill={fill} />;
      })}
      {budget > 0 && (
        <line
          x1="0"
          y1={y(budget)}
          x2="500"
          y2={y(budget)}
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeDasharray="6 4"
        />
      )}
      {budget > 0 && (
        <text x="0" y={y(budget) - 5} fill="#38bdf8" fontSize="11" fontFamily="monospace">
          {budget.toFixed(1)}s budget
        </text>
      )}
      <text x="0" y={H + 18} fill="#64748b" fontSize="11" fontFamily="monospace">
        Q1
      </text>
      <text x="460" y={H + 18} fill="#64748b" fontSize="11" fontFamily="monospace">
        Q{secs.length}
      </text>
    </svg>
  );
}

function Results({ questions, result, onRestart }) {
  const [filter, setFilter] = useState("all");
  const [showAllMethods, setShowAllMethods] = useState(false);
  const { answers, flags, used } = result;
  const spent = result.spent || questions.map(() => 0);
  const budget = result.budget || 0;
  const totalAllowed = result.total || 0;

  const stats = useMemo(() => {
    const byCat = { verbal: [0, 0], maths: [0, 0], spatial: [0, 0] };
    let correct = 0;
    questions.forEach((q, i) => {
      byCat[q.cat][1] += 1;
      if (answers[i] === q.answer) {
        correct += 1;
        byCat[q.cat][0] += 1;
      }
    });
    return { correct, byCat, attempted: answers.filter((a) => a != null).length };
  }, [questions, answers]);

  const timing = useMemo(() => {
    const secs = spent.map((ms) => ms / 1000);
    const catTime = { verbal: 0, maths: 0, spatial: 0 };
    const buckets = { correct: [0, 0], wrong: [0, 0], skipped: [0, 0] };
    questions.forEach((q, i) => {
      catTime[q.cat] += secs[i];
      const b = answers[i] == null ? "skipped" : answers[i] === q.answer ? "correct" : "wrong";
      buckets[b][0] += secs[i];
      buckets[b][1] += 1;
    });
    const reached = secs.filter((v) => v > 0.15).length;
    const total = secs.reduce((a, b) => a + b, 0);
    const slowest = secs
      .map((v, i) => ({ i, v }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 5)
      .filter((r) => r.v > 1);
    return { secs, catTime, buckets, reached, total, slowest };
  }, [questions, answers, spent]);

  const avg = (t, n) => (n > 0 ? `${(t / n).toFixed(1)}s` : "--");

  const weakSpots = useMemo(() => {
    const tally = {};
    questions.forEach((q, i) => {
      if (answers[i] === q.answer) return;
      const g = guideFor(q);
      const name = g ? g.s.name : CAT_LABEL[q.cat];
      tally[name] = (tally[name] || 0) + 1;
    });
    return Object.entries(tally).sort((a, b) => b[1] - a[1]);
  }, [questions, answers]);

  const rows = questions
    .map((q, i) => ({ q, i }))
    .filter(({ q, i }) => {
      if (filter === "wrong") return answers[i] !== q.answer;
      if (filter === "flagged") return flags[i];
      if (filter === "skipped") return answers[i] == null;
      return true;
    });

  const filters = [
    ["all", `All ${questions.length}`],
    ["wrong", `Dropped ${questions.length - stats.correct}`],
    ["flagged", `Flagged ${flags.filter(Boolean).length}`],
    ["skipped", `Skipped ${questions.length - stats.attempted}`],
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <p className="font-mono text-xs tracking-widest text-sky-400 uppercase">Result</p>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="font-mono text-6xl tabular-nums">{stats.correct}</span>
          <span className="font-mono text-2xl text-slate-500">/ {questions.length}</span>
        </div>
        <p className="mt-2 text-sm text-slate-400">
          {stats.attempted} attempted · {Math.round((stats.correct / questions.length) * 100)}%
          correct · {totalAllowed ? `${fmt(used)} used of ${fmt(totalAllowed)}` : `${fmt(used)} taken, no clock`}
        </p>

        <div className="mt-6 space-y-3">
          {Object.entries(stats.byCat).map(([cat, [c, t]]) => (
            <div key={cat}>
              <div className="flex justify-between font-mono text-xs text-slate-400">
                <span className="uppercase tracking-widest">{CAT_LABEL[cat]}</span>
                <span>
                  {c}/{t} · {avg(timing.catTime[cat], t)} avg
                </span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-slate-700">
                <div
                  className="h-2 rounded-full bg-sky-500"
                  style={{ width: `${t ? (c / t) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-slate-700 bg-slate-800 p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
            Time per question
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="font-mono text-4xl tabular-nums">
              {avg(timing.total, timing.reached)}
            </span>
            <span className="text-sm text-slate-400">
              average across the {timing.reached} you reached
            </span>
          </div>
          {budget > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              The budget was {budget.toFixed(1)}s a question to reach all 50.
            </p>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              ["Got right", timing.buckets.correct, "text-emerald-400"],
              ["Got wrong", timing.buckets.wrong, "text-rose-400"],
              ["Skipped", timing.buckets.skipped, "text-slate-400"],
            ].map(([label, [t, n], tone]) => (
              <div key={label} className="rounded-lg border border-slate-700 p-2">
                <p className={`font-mono text-lg tabular-nums ${tone}`}>{avg(t, n)}</p>
                <p className="mt-0.5 text-xs text-slate-500">{label}</p>
                <p className="font-mono text-xs text-slate-500">{n} q</p>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <PaceChart questions={questions} answers={answers} secs={timing.secs} budget={budget} />
          </div>

          {timing.slowest.length > 0 && (
            <div className="mt-3">
              <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
                Biggest time sinks
              </p>
              <ul className="mt-2 space-y-1">
                {timing.slowest.map(({ i, v }) => (
                  <li key={i} className="flex justify-between font-mono text-xs text-slate-400">
                    <span>
                      Q{String(i + 1).padStart(2, "0")} · {CAT_LABEL[questions[i].cat]}
                    </span>
                    <span>
                      {v.toFixed(1)}s ·{" "}
                      {answers[i] == null
                        ? "skipped"
                        : answers[i] === questions[i].answer
                        ? "right"
                        : "wrong"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          onClick={onRestart}
          className="mt-7 w-full rounded-xl bg-sky-500 py-3.5 text-sm font-semibold text-slate-900 hover:bg-sky-400"
        >
          Take a fresh 50
        </button>

        {weakSpots.length > 0 && (
          <div className="mt-8">
            <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
              Where the points went
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {weakSpots.map(([name, n]) => (
                <span
                  key={name}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300"
                >
                  {name}{" "}
                  <span className="font-mono text-xs text-rose-400">
                    {n} {n === 1 ? "miss" : "misses"}
                  </span>
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Each missed question below carries a worked method for that question type.
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-2">
          {filters.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded-lg border px-3 py-1.5 font-mono text-xs ${
                filter === k
                  ? "border-sky-400 bg-sky-900 text-sky-200"
                  : "border-slate-700 text-slate-400"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setShowAllMethods(!showAllMethods)}
            className={`rounded-lg border px-3 py-1.5 font-mono text-xs ${
              showAllMethods
                ? "border-emerald-400 bg-emerald-900 text-emerald-100"
                : "border-slate-700 text-slate-400"
            }`}
          >
            {showAllMethods ? "Method on all" : "Method on misses"}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {rows.length === 0 && (
            <p className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-400">
              Nothing in this list.
            </p>
          )}
          {rows.map(({ q, i }) => {
            const got = answers[i];
            const right = got === q.answer;
            return (
              <div
                key={q.id}
                className="rounded-xl border border-slate-700 bg-slate-800 p-4"
              >
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-slate-500">
                    {String(i + 1).padStart(2, "0")} · {CAT_LABEL[q.cat]} ·{" "}
                    {timing.secs[i].toFixed(1)}s{flags[i] ? " · flagged" : ""}
                  </span>
                  <span className={right ? "text-emerald-400" : got == null ? "text-slate-500" : "text-rose-400"}>
                    {right ? "correct" : got == null ? "not answered" : "incorrect"}
                  </span>
                </div>
                <p className="mt-2 text-base leading-snug">{q.prompt}</p>
                {q.stem && <StemRow stem={q.stem} />}
                <div
                  className={`mt-3 grid gap-2 ${
                    typeof q.options[0] === "object" ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-1"
                  }`}
                >
                  {q.options.map((opt, k) => (
                    <OptionButton
                      key={k}
                      opt={opt}
                      letter={LETTERS[k]}
                      state={k === q.answer ? "correct" : k === got ? "wrong" : "idle"}
                      disabled
                      onClick={() => {}}
                    />
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{q.why}</p>
                {(() => {
                  const guide = guideFor(q);
                  if (!guide || (right && !showAllMethods)) return null;
                  return (
                    <div className="mt-3 rounded-lg border border-sky-700 bg-slate-900 p-3">
                      <p className="font-mono text-xs uppercase tracking-widest text-sky-400">
                        How to solve it · {guide.s.name}
                      </p>

                      <div className="mt-3 space-y-2">
                        {guide.rows.map((r, k) => (
                          <div key={k} className="flex flex-wrap items-center gap-1.5">
                            <span className="w-16 shrink-0 font-mono text-xs uppercase text-slate-500">
                              {r.label}
                            </span>
                            {r.cells.map((c, j) => (
                              <span key={j} className="flex items-center gap-1.5">
                                {j > 0 && <span className="font-mono text-xs text-slate-600">›</span>}
                                <span
                                  className={`rounded-md px-2 py-1 font-mono text-sm ${
                                    j === r.cells.length - 1 && r.cells.length > 1
                                      ? "bg-slate-700 text-slate-50"
                                      : "bg-slate-800 text-slate-300"
                                  }`}
                                >
                                  {c}
                                </span>
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>

                      {guide.steps.length > 0 && (
                        <ul className="mt-3 space-y-1">
                          {guide.steps.map((st, k) => (
                            <li key={k} className="flex gap-2 text-sm leading-snug text-slate-200">
                              <span className="text-sky-400">·</span>
                              <span>{st}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {guide.trap && (
                        <p className="mt-3 flex gap-2 rounded-md border border-rose-600 bg-slate-800 p-2 text-sm leading-snug text-rose-100">
                          <span className="font-mono text-xs uppercase text-rose-400">trap</span>
                          <span>{guide.trap}</span>
                        </p>
                      )}

                      {guide.s.trick && (
                        <div className="mt-2 rounded-md border border-amber-600 bg-slate-800 p-2">
                          <p className="font-mono text-xs uppercase tracking-widest text-amber-400">
                            In your head
                          </p>
                          <ul className="mt-1 space-y-0.5">
                            {guide.s.trick.map((tr, k) => (
                              <li key={k} className="text-sm leading-snug text-amber-100">
                                {tr}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <details className="mt-3">
                        <summary className="cursor-pointer font-mono text-xs text-slate-500">
                          Method for any {guide.s.name.toLowerCase()} question
                        </summary>
                        <ul className="mt-2 space-y-1">
                          {guide.s.method.map((m, k) => (
                            <li key={k} className="flex gap-2 text-sm leading-snug text-slate-400">
                              <span className="text-slate-600">·</span>
                              <span>{m}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-sm leading-snug text-slate-400">
                          e.g. {guide.s.example}
                        </p>
                      </details>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-xs leading-relaxed text-slate-500">
          Practice items only. A raw score here is a rough gauge of pace and accuracy,
          not a percentile against any real test population. Timings are wall-clock per
          question, so anything you leave open while you look away is counted.
        </p>
      </div>
    </div>
  );
}

export default function AptitudeTraining() {
  const [phase, setPhase] = useState("intro");
  const [config, setConfig] = useState({ mode: "exam", auto: true });
  const [questions, setQuestions] = useState([]);
  const [result, setResult] = useState(null);

  const start = (cfg) => {
    setConfig(cfg);
    setQuestions(buildTest());
    setResult(null);
    setPhase("test");
  };

  if (phase === "intro") return <Intro onStart={start} />;
  if (phase === "test")
    return (
      <Test
        key={questions.length + "-" + config.mode + "-" + (result ? "r" : "n")}
        config={config}
        questions={questions}
        onFinish={(r) => {
          setResult(r);
          setPhase("results");
        }}
      />
    );
  return (
    <Results
      questions={questions}
      result={result}
      onRestart={() => setPhase("intro")}
    />
  );
}
