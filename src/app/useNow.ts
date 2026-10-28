import { useEffect, useState } from "react"

/** Milliseconds from a steady clock that never jumps when the system clock changes. */
export const now = (): number => performance.now()

/**
 * Re-renders about four times a second while active, and straight away when
 * the tab becomes visible again (background tabs slow timers down).
 */
export function useNow(active: boolean): number {
  const [t, setT] = useState(now)
  useEffect(() => {
    if (!active) return
    const tick = () => setT(now())
    const id = window.setInterval(tick, 250)
    document.addEventListener("visibilitychange", tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [active])
  return t
}
