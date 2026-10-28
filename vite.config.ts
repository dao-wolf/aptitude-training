import { readFileSync } from "node:fs"
import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"

// The element loads its stylesheet with a <link> inside its shadow root, so a
// strict CSP (style-src 'self') allows it. Vite would inline a CSS import, so
// the file is copied next to the bundle instead.
const STYLESHEET = "src/element/aptitude-training.css"

function copyStylesheet(): Plugin {
  return {
    name: "copy-stylesheet",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "aptitude-training.css",
        source: readFileSync(STYLESHEET, "utf8"),
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), copyStylesheet()],
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    target: "es2022",
    sourcemap: true,
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "aptitude-training.js",
    },
  },
})
