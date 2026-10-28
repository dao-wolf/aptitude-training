import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
  type RefObject,
} from "react"

/**
 * Embedded: the host page already has the main heading and intro, so the app
 * drops its own and its screen titles become level-2 headings.
 */
export const EmbeddedContext = createContext(false)

export const Title = forwardRef<HTMLHeadingElement, { children: ReactNode }>(
  function Title({ children }, ref) {
    const Tag = useContext(EmbeddedContext) ? "h2" : "h1"
    return (
      <Tag ref={ref} tabIndex={-1} className="at-title">
        {children}
      </Tag>
    )
  }
)

/**
 * When `key` changes, move focus to the element (so screen readers start there)
 * and scroll it into view if it isn't already. Before paint, so nothing jumps.
 * The scroll is instant, even on a page with smooth scrolling: a smooth scroll
 * can still be running when the next question appears, and leave it off screen.
 */
export function useRevealOnChange(
  ref: RefObject<HTMLElement | null>,
  key: unknown
) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus({ preventScroll: true })
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
    const r = el.getBoundingClientRect()
    if (r.top < margin || r.bottom > window.innerHeight) scrollToTop(el)
  }, [ref, key])
}

function scrollToTop(el: HTMLElement) {
  try {
    el.scrollIntoView({ block: "start", behavior: "instant" })
  } catch {
    // A browser that predates "instant" rejects the option: scroll anyway.
    el.scrollIntoView(true)
  }
}

/** True once the element has scrolled fully out of the viewport. */
export function useOutOfView(ref: RefObject<HTMLElement | null>): boolean {
  const [out, setOut] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) =>
      setOut(entry ? !entry.isIntersecting : false)
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return out
}
