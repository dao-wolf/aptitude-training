import type { SessionState } from "./session"
import {
  CATEGORIES,
  type Category,
  type Item,
  type OptionId,
  type Paper,
} from "./types"

export interface QuestionResult {
  itemId: string
  category: Category
  chosen: OptionId | null
  answer: OptionId
  correct: boolean
  spentMs: number
}

export interface CategorySummary {
  total: number
  correct: number
  answered: number
  spentMs: number
}

export interface Summary {
  total: number
  correct: number
  answered: number
  skipped: number
  reached: number
  percent: number
  /** Average time on the questions you reached, in milliseconds. */
  averageMs: number
  byCategory: Partial<Record<Category, CategorySummary>>
  results: QuestionResult[]
}

/** Raw marking only: no percentile, because there's no norm group to compare with. */
export function score(
  paper: Paper,
  bank: readonly Item[],
  state: SessionState
): Summary {
  const items = new Map(bank.map(item => [item.id, item]))
  const results = paper.questions.map((q, i): QuestionResult => {
    const item = items.get(q.itemId)
    if (!item) throw new Error(`Unknown question ${q.itemId}`)
    const chosen = state.answers[i] ?? null
    return {
      itemId: item.id,
      category: item.category,
      chosen,
      answer: item.answer,
      correct: chosen === item.answer,
      spentMs: state.spentMs[i] ?? 0,
    }
  })

  const byCategory: Partial<Record<Category, CategorySummary>> = {}
  for (const category of CATEGORIES) {
    const mine = results.filter(r => r.category === category)
    if (mine.length === 0) continue
    byCategory[category] = {
      total: mine.length,
      correct: mine.filter(r => r.correct).length,
      answered: mine.filter(r => r.chosen !== null).length,
      spentMs: mine.reduce((sum, r) => sum + r.spentMs, 0),
    }
  }

  const total = results.length
  const correct = results.filter(r => r.correct).length
  const answered = results.filter(r => r.chosen !== null).length
  const reached = Math.min(total, state.furthest + 1)
  const spent = results.slice(0, reached).reduce((sum, r) => sum + r.spentMs, 0)

  return {
    total,
    correct,
    answered,
    skipped: total - answered,
    reached,
    percent: total === 0 ? 0 : Math.round((correct / total) * 100),
    averageMs: reached === 0 ? 0 : Math.round(spent / reached),
    byCategory,
    results,
  }
}
