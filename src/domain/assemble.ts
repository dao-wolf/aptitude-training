import { shuffle } from "./rng"
import type { Category, Item, OptionId, Paper, TestSpec } from "./types"

export interface AssembleInput {
  spec: TestSpec
  bank: readonly Item[]
  seed: number
  rng: () => number
  /** Item ids seen before, oldest first. Unseen items come first, then the longest ago. */
  recent?: readonly string[]
}

/**
 * Builds a paper: the spec's count from each category, least recently seen
 * first, no two "enemy" items together, categories mixed, options shuffled
 * unless their order means something (e.g. numbers in ascending order).
 */
export function assemblePaper({
  spec,
  bank,
  seed,
  rng,
  recent = [],
}: AssembleInput): Paper {
  const seenAt = new Map(recent.map((id, i) => [id, i]))
  const picked: Item[] = []
  const blocked = new Set<string>()

  for (const [category, count] of Object.entries(spec.blueprint) as [
    Category,
    number,
  ][]) {
    const pool = shuffle(
      bank.filter(
        item =>
          item.category === category && item.status === "live" && !item.practice
      ),
      rng
    ).sort((x, y) => (seenAt.get(x.id) ?? -1) - (seenAt.get(y.id) ?? -1))

    let taken = 0
    for (const item of pool) {
      if (taken === count) break
      if (blocked.has(item.id)) continue
      picked.push(item)
      taken++
      for (const enemy of item.enemies ?? []) blocked.add(enemy)
    }
    if (taken < count) {
      throw new Error(
        `Not enough ${category} questions: need ${count}, have ${taken}`
      )
    }
  }

  return {
    specId: spec.id,
    seed,
    questions: shuffle(picked, rng).map(item => ({
      itemId: item.id,
      optionOrder: optionOrder(item, rng),
    })),
  }
}

function optionOrder(item: Item, rng: () => number): OptionId[] {
  const ids = item.options.map(o => o.id)
  return item.ordered ? ids : shuffle(ids, rng)
}
