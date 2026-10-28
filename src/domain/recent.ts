// "Recently seen" question ids, kept in the visitor's browser so the next paper
// leads with questions they haven't met. Stored data is untrusted: anything
// that isn't a short list of plain ids is thrown away.

const ID = /^[a-z][a-z0-9-]{0,31}$/
export const RECENT_CAP = 200

/** Parse stored data: a JSON list of ids, oldest first. Junk gives an empty list. */
export function parseRecent(raw: string | null | undefined): string[] {
  if (typeof raw !== "string" || raw.length > 20000) return []
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(value)) return []
  const ids = value.filter(
    (v): v is string => typeof v === "string" && ID.test(v)
  )
  return [...new Set(ids)].slice(-RECENT_CAP)
}

/** Move the ids just seen to the end (newest), keeping the list capped. */
export function updateRecent(
  recent: readonly string[],
  seen: readonly string[]
): string[] {
  const seenSet = new Set(seen)
  return [...recent.filter(id => !seenSet.has(id)), ...seen].slice(-RECENT_CAP)
}
