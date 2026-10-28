# 1. Ship as a custom element with an open shadow root

**Status:** accepted, 28 Oct 2026

## Context

The app has to drop into any page, starting with an Astro site that has its own
styles and no React. Its styles mustn't leak out, and the page's mustn't leak in.

## Decision

Ship one `<aptitude-training>` element. React renders inside an **open** shadow
root, and the stylesheet loads with a `<link>`, so a strict content security
policy (`style-src 'self'`) allows it.

## Consequences

- A spike passed in Chromium, Firefox and WebKit: keyboard use, focus moves,
  live announcements and axe all work inside the shadow root.
- Open, not closed, so screen readers, axe and Playwright can see inside.
- The bundle carries its own React (about 52 KB compressed).
