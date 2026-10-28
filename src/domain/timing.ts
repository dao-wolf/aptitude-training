/** Extra-time presets, as multipliers of the standard time. 0 means no clock. */
export const TIME_PRESETS = [
  { id: "standard", label: "Standard", factor: 1 },
  { id: "plus25", label: "+25%", factor: 1.25 },
  { id: "plus50", label: "+50%", factor: 1.5 },
  { id: "plus100", label: "+100%", factor: 2 },
  { id: "untimed", label: "No clock", factor: 0 },
] as const

export type TimePresetId = (typeof TIME_PRESETS)[number]["id"]

/** Seconds allowed for a preset; 0 means untimed. */
export function allowedSeconds(
  standardSeconds: number,
  preset: TimePresetId
): number {
  const found = TIME_PRESETS.find(p => p.id === preset)
  return Math.round(standardSeconds * (found?.factor ?? 1))
}

/** Milliseconds left, never below zero. Untimed (limit 0) is always Infinity. */
export function remainingMs(
  now: number,
  startedAt: number,
  limitSeconds: number
): number {
  if (limitSeconds <= 0) return Infinity
  return Math.max(0, startedAt + limitSeconds * 1000 - now)
}

/** mm:ss, rounding up so the clock never shows 0:00 while time is left. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, "0")}`
}
