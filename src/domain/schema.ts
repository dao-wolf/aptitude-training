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

/** Every problem in the bank, as plain sentences. An empty list means it's fine. */
export function validateBank(items: unknown, methods: unknown): string[] {
  const problems: string[] = []
  const parsedMethods = z.record(z.string(), methodSchema).safeParse(methods)
  if (!parsedMethods.success)
    return [`methods: ${parsedMethods.error.issues[0]?.message}`]
  const parsedItems = z.array(z.unknown()).safeParse(items)
  if (!parsedItems.success) return ["items: not a list"]

  const ids = new Map<string, number>()
  const valid: z.infer<typeof itemSchema>[] = []
  parsedItems.data.forEach((raw, i) => {
    const r = itemSchema.safeParse(raw)
    if (!r.success) {
      const issue = r.error.issues[0]
      problems.push(`item ${i}: ${issue?.path.join(".")} ${issue?.message}`)
      return
    }
    valid.push(r.data)
    ids.set(r.data.id, (ids.get(r.data.id) ?? 0) + 1)
  })

  for (const [id, count] of ids)
    if (count > 1) problems.push(`${id}: id used ${count} times`)

  for (const item of valid) {
    const p = (msg: string) => problems.push(`${item.id}: ${msg}`)
    const optIds = item.options.map(o => o.id)
    if (optIds.join() !== OPTION_IDS.join())
      p("options must be exactly a, b, c, d, e in order")
    if (!optIds.includes(item.answer)) p("answer is not one of the options")
    if (!(item.method in parsedMethods.data))
      p(`unknown method "${item.method}"`)
    if (
      parsedMethods.data[item.method] &&
      parsedMethods.data[item.method]?.id !== item.method
    ) {
      p(`method "${item.method}" has a different id`)
    }

    const isText = item.kind === "text"
    for (const o of item.options) {
      if (isText && (o.text === undefined || o.visual !== undefined))
        p(`option ${o.id} must be text only`)
      if (!isText && (o.visual === undefined || o.text !== undefined))
        p(`option ${o.id} must be a picture only`)
      if (o.visual?.kind === "q") p(`option ${o.id} can't be a question mark`)
    }
    if (item.stem && isText) p("only picture questions have a stem")

    const keys = item.options.map(optionKey)
    if (new Set(keys).size !== keys.length) p("two options are the same")

    if (item.ordered) {
      if (!isText) p("only text options can be ordered")
      const nums = item.options.map(o => toNumber(o.text ?? ""))
      if (nums.some(n => n === null)) p("ordered options must all be numbers")
      else if (
        nums.some((n, i) => i > 0 && (n as number) < (nums[i - 1] as number))
      ) {
        p("ordered options must run from smallest to largest")
      }
    }

    for (const enemy of item.enemies ?? []) {
      const other = valid.find(v => v.id === enemy)
      if (!other) p(`enemy ${enemy} doesn't exist`)
      else if (!(other.enemies ?? []).includes(item.id))
        p(`enemy ${enemy} doesn't list ${item.id} back`)
    }
  }
  return problems
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
