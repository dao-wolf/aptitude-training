# How we test

Every change has to pass the first five layers, and every deploy the sixth. The last one is a person (or an
agent) using the app, because automated tests miss what users feel.

| Layer                   | What it catches                                                      | Where                                    |
| ----------------------- | -------------------------------------------------------------------- | ---------------------------------------- |
| Unit and property tests | Wrong logic: papers, scoring, timing, the bank                       | `tests/unit`                             |
| Mutation testing        | Tests that pass but check too little                                 | `pnpm mutate`, logic only                |
| Journeys                | Broken flows, on desktop and a phone, under a strict security policy | `tests/e2e`                              |
| Host-page journeys      | Problems that only show inside a real page                           | `tests/e2e/host.spec.ts`                 |
| Exploratory pass        | Anything else                                                        | The checklist below, before each release |
| Live check              | A broken or stale page on the real site, after each deploy           | `pnpm e2e:live`, then the checklist      |

## Rules we learned the hard way

These come from the exploratory pass on 28 Oct 2026, which found 11 problems
that 136 automated tests missed.

1. **Test inside a realistic page.** A blank test page hides scroll, overlap
   and heading problems. Use `/host`: content above the app and a fixed button.
2. **Check what's visible, not just what exists.** Playwright scrolls elements
   into view before it acts, so assert `toBeInViewport()` after every move.
3. **Be rough on purpose.** Double-click, tap twice, press keys fast, leave
   mid-test and come back. Automated clicks are too polite.
4. **Write the expected behaviour first, in plain words.** Then assert that.
   An assertion copied from the screen will pass a bug.
5. **Screens display, logic calculates.** Sums in components escape unit and
   mutation tests. Put them in `src/domain` and show the result.

## Exploratory checklist (before each release)

Spend 20 minutes on the release build inside the real site page, on desktop
and at phone size. Try the happy path, then each of these:

- Answer wrong, try again, skip, and end early.
- Double-click every button. Tap answers twice. Use only the keyboard.
- Press Back, refresh and switch tabs during a test.
- Scroll during a question. Can you still see the clock and the question?
- Let the time run out, and use each time preset.
- Read every message as a first-time visitor. Is anything confusing or untrue?
- Check the results add up.

Each problem found becomes a failing test first, then a fix.

## After each deploy

Check the real page, not just the deploy log:

1. The app's files on the site match the signed release byte for byte:
   compare them with the release's `SHA256SUMS`.
2. Run `pnpm e2e:live`. It runs the host-page checks, a full test and a
   privacy check on the live page, at desktop and phone size. It answers the
   site's analytics calls itself, so test runs don't count as visits.
3. Run the exploratory checklist above on the live page.
