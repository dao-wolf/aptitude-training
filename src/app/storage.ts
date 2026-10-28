import { parseRecent, updateRecent } from "../domain/recent"

// Browser storage can be missing, full or blocked. Every access is guarded and
// the app works the same without it.
const KEY = "aptitude-training:recent"

export function loadRecent(): string[] {
  try {
    return parseRecent(window.localStorage.getItem(KEY))
  } catch {
    return []
  }
}

export function rememberSeen(ids: readonly string[]): void {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify(updateRecent(loadRecent(), ids))
    )
  } catch {
    // Storage unavailable: the next paper just won't know what was seen.
  }
}
