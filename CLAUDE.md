# CLAUDE.md

Aptitude Training is a timed practice test for the aptitude tests employers use in hiring. It is published to npm as `@daowolf/aptitude-training` and embedded on daowolf.com at `/projects/aptitude-training/`. How we work is in `CONTRIBUTING.md`, the testing approach in `docs/testing.md`, and the decisions in `docs/adr/`.

## Commands

- `pnpm check` runs everything CI runs: typecheck, lint, unit tests, build and browser tests.
- `pnpm dev` starts the dev server. `pnpm e2e:live` runs the browser tests against the live page on daowolf.com.
- `pnpm mutate` runs mutation tests, and `pnpm docs` checks the prose with Vale.

## Rules

- **Outside-in:** write a failing Playwright journey for the change first.
- **Playwright:**
  - `toHaveText` passes on a hidden element, so pair it with `toBeVisible`;
  - for visually hidden text, measure its width, because `toBeVisible` counts a 1px clip as visible (system-design-quest #4).
- **CI inputs:** a manual input that feeds a shell test such as `-gt` must be checked against a `case` pattern first. Otherwise a bad value falls through and the run goes green without doing what was asked.
- **Browsers in cloud sessions:** Claude Code cloud sessions ship a Chromium that matches Playwright 1.56.1, and this repo uses 1.64.1. There, leave the browser tests to CI or install Chromium first. Upgrade Playwright in its own PR.
- **Copy:** "no tracking" is true of this package, not of daowolf.com, which runs Google Analytics behind consent. Don't repeat it in copy that will appear on the site.

## Releases (Oleg approves each one)

- **Tags:** pushing a `vX.Y.Z` tag builds the package, stages the npm publish and drafts the GitHub release. Releases are immutable, so never push a tag without Oleg's go in this session.
- **npm approval:** Oleg approves the staged publish on npm.
- **README snippet:** move its CDN or install line to the new version only after that approval, in its own PR. Before then the link returns 404 (#8).
- **Version bumps** get their own PR.
