import { StrictMode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { App } from "../app/App"
import { EmbeddedContext } from "../app/layout"

// A variable, not a literal: Vite would otherwise inline the file as a data
// URL, which a strict CSP blocks.
const STYLESHEET = "./aptitude-training.css"

/**
 * <aptitude-training>: the whole app in an open shadow root, so the host
 * page's CSS can't reach in and ours can't leak out. Open (not closed) so
 * assistive tech, axe and Playwright can see inside.
 */
export class AptitudeTrainingElement extends HTMLElement {
  #root: Root | null = null

  connectedCallback() {
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" })
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = new URL(STYLESHEET, import.meta.url).href
    const mount = document.createElement("div")
    mount.className = "at-root"
    shadow.replaceChildren(link, mount)
    this.#root = createRoot(mount)
    this.#root.render(
      <StrictMode>
        <EmbeddedContext.Provider value={this.hasAttribute("embedded")}>
          <App
            seed={
              this.getAttribute("seed") ??
              new URLSearchParams(window.location.search).get("seed")
            }
          />
        </EmbeddedContext.Provider>
      </StrictMode>
    )
  }

  disconnectedCallback() {
    this.#root?.unmount()
    this.#root = null
  }
}
