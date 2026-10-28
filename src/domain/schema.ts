import { z } from "zod"

// Checks the question bank. Used by tests and CI, never shipped to browsers.

const optionId = z.enum(["a", "b", "c", "d", "e"])

const visual = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("fig"),
      fig: z.enum(["flag", "ell", "tee", "notch", "arrowTab", "stairs"]),
      rot: z
        .number()
        .int()
        .refine(r => r % 45 === 0, "rotation must be a multiple of 45"),
      flip: z.boolean(),
      hollow: z.boolean(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("grid"),
      cells: z.array(z.number().int().min(0).max(8)),
    })
    .strict(),
  z
    .object({ kind: z.literal("poly"), sides: z.number().int().min(3).max(12) })
    .strict(),
  z
    .object({ kind: z.literal("dots"), n: z.number().int().min(0).max(20) })
    .strict(),
  z.object({ kind: z.literal("sym"), v: z.string().min(1).max(4) }).strict(),
  z.object({ kind: z.literal("q") }).strict(),
])

const row = z.object({ label: z.string(), cells: z.array(z.string()) }).strict()

export const itemSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    category: z.enum(["verbal", "maths", "spatial"]),
    method: z.string().min(1),
    kind: z.enum(["text", "visual"]),
    prompt: z.string().min(1).max(400),
    stem: z.array(visual).optional(),
    options: z.array(
      z
        .object({
          id: optionId,
          text: z.string().min(1).max(200).optional(),
          visual: visual.optional(),
        })
        .strict()
    ),
    answer: optionId,
    ordered: z.boolean().optional(),
    enemies: z.array(z.string()).optional(),
    practice: z.literal(true).optional(),
    explanation: z
      .object({
        why: z.string().min(1),
        rows: z.array(row),
        steps: z.array(z.string()),
        trap: z.string().min(1).optional(),
      })
      .strict(),
    status: z.enum([
      "draft",
      "screened",
      "blind-solved",
      "reviewed",
      "live",
      "retired",
    ]),
    provenance: z
      .object({
        origin: z.literal("original"),
        writtenBy: z.string().min(1),
        created: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/),
      })
      .strict(),
  })
  .strict()

export const methodSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    method: z.array(z.string().min(1)).min(1),
    trick: z.array(z.string().min(1)).optional(),
    example: z.string().min(1).optional(),
  })
  .strict()

const OPTION_IDS = ["a", "b", "c", "d", "e"]

type ParsedItem = z.infer<typeof itemSchema>
type Methods = Record<string, z.infer<typeof methodSchema>>
type Rule = (
  item: ParsedItem,
  ctx: { methods: Methods; items: ParsedItem[] }
) => string[]

// Each rule returns its problems for one item, as plain sentences.
const RULES: Rule[] = [
  item => {
    const ids = item.options.map(o => o.id)
    return [
      ...(ids.join() === OPTION_IDS.join()
        ? []
        : ["options must be exactly a, b, c, d, e in order"]),
      ...(ids.includes(item.answer)
        ? []
        : ["answer is not one of the options"]),
    ]
  },
  (item, { methods }) => {
    const method = methods[item.method]
    if (!method) return [`unknown method "${item.method}"`]
    return method.id === item.method
      ? []
      : [`method "${item.method}" has a different id`]
  },
  item => item.options.flatMap(o => optionKindProblems(item.kind, o)),
  item =>
    item.stem && item.kind === "text"
      ? ["only picture questions have a stem"]
      : [],
  item => {
    const keys = item.options.map(optionKey)
    return new Set(keys).size === keys.length
      ? []
      : ["two options are the same"]
  },
  item => (item.ordered ? orderedProblems(item) : []),
  (item, { items }) =>
    (item.enemies ?? []).flatMap(enemy => enemyProblems(item, enemy, items)),
]

function optionKindProblems(
  kind: ParsedItem["kind"],
  o: ParsedItem["options"][number]
): string[] {
  const problems: string[] = []
  if (kind === "text" && (o.text === undefined || o.visual !== undefined))
    problems.push(`option ${o.id} must be text only`)
  if (kind === "visual" && (o.visual === undefined || o.text !== undefined))
    problems.push(`option ${o.id} must be a picture only`)
  if (o.visual?.kind === "q")
    problems.push(`option ${o.id} can't be a question mark`)
  return problems
}

function orderedProblems(item: ParsedItem): string[] {
  if (item.kind !== "text") return ["only text options can be ordered"]
  const nums = item.options.map(o => toNumber(o.text ?? ""))
  if (nums.some(n => n === null)) return ["ordered options must all be numbers"]
  const ascending = nums.every(
    (n, i) => i === 0 || (n as number) >= (nums[i - 1] as number)
  )
  return ascending ? [] : ["ordered options must run from smallest to largest"]
}

function enemyProblems(
  item: ParsedItem,
  enemy: string,
  items: ParsedItem[]
): string[] {
  const other = items.find(v => v.id === enemy)
  if (!other) return [`enemy ${enemy} doesn't exist`]
  return (other.enemies ?? []).includes(item.id)
    ? []
    : [`enemy ${enemy} doesn't list ${item.id} back`]
}

/** Parse each item on its own, so one bad item doesn't hide the others. */
function parseItems(raw: unknown[]): {
  items: ParsedItem[]
  problems: string[]
} {
  const items: ParsedItem[] = []
  const problems: string[] = []
  raw.forEach((value, i) => {
    const r = itemSchema.safeParse(value)
    if (r.success) items.push(r.data)
    else
      problems.push(
        `item ${i}: ${r.error.issues[0]?.path.join(".")} ${r.error.issues[0]?.message}`
      )
  })
  return { items, problems }
}

function duplicateIds(items: ParsedItem[]): string[] {
  const counts = new Map<string, number>()
  for (const item of items) counts.set(item.id, (counts.get(item.id) ?? 0) + 1)
  return [...counts]
    .filter(([, n]) => n > 1)
    .map(([id, n]) => `${id}: id used ${n} times`)
}

/** Every problem in the bank, as plain sentences. An empty list means it's fine. */
export function validateBank(items: unknown, methods: unknown): string[] {
  const parsedMethods = z.record(z.string(), methodSchema).safeParse(methods)
  if (!parsedMethods.success)
    return [`methods: ${parsedMethods.error.issues[0]?.message}`]
  const list = z.array(z.unknown()).safeParse(items)
  if (!list.success) return ["items: not a list"]

  const parsed = parseItems(list.data)
  const ctx = { methods: parsedMethods.data, items: parsed.items }
  const itemProblems = parsed.items.flatMap(item =>
    RULES.flatMap(rule => rule(item, ctx)).map(p => `${item.id}: ${p}`)
  )
  return [...parsed.problems, ...duplicateIds(parsed.items), ...itemProblems]
}

function optionKey(o: { text?: string | undefined; visual?: unknown }): string {
  if (o.text !== undefined) {
    const n = toNumber(o.text)
    return n === null ? `t:${o.text.trim().toLowerCase()}` : `n:${n}`
  }
  return `v:${JSON.stringify(o.visual)}`
}

/** "£54", "4 h", "12%", "1,200" → number; anything else → null. */
export function toNumber(text: string): number | null {
  const m = /^[£$]?\s*(-?\d+(?:\.\d+)?)\s*(%|[a-z ]+)?$/i.exec(
    text.trim().replace(/,/g, "")
  )
  return m ? Number(m[1]) : null
}
