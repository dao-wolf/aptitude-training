# Aptitude Training

Free practice for aptitude tests: verbal reasoning, numerical and spatial.
Timed like the real thing, with a worked explanation for every question.

**Try it:** [daowolf.com/aptitude-training](https://daowolf.com/aptitude-training) (launching soon)

> Practice only. All questions are original. Your score here doesn't predict
> your result on any real test, and there's no percentile, because the questions
> aren't compared against a group of test-takers.

## What you get

- A timed 50-question mixed test, and short drills by section
- Time presets: standard, +25%, +50%, +100% or no clock
- A worked explanation and a common trap for every question
- No account, no tracking, no adverts

## Use it on your own page

Install it from npm, or load it from a CDN:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@daowolf/aptitude-training@0.1.0/dist/aptitude-training.js"
></script>
<aptitude-training></aptitude-training>
```

The stylesheet loads from next to the script. Add `embedded` when your page
already has its own heading. GitHub Actions builds every version,
and the maintainer approves each one on npm before it goes public.

## Develop

You need Node 22 or later and pnpm 10.

```sh
pnpm install
pnpm dev     # local page
pnpm check   # everything CI runs
```

## How it's tested

- **Journeys:** Playwright runs each user journey against the built element in
  Chromium, on desktop and on an emulated phone, under a strict security policy,
  with axe checking accessibility. A 320 px check makes sure every screen fits a
  small phone and every control is big enough to tap.
- **Logic:** unit and property tests on the pure code that builds papers and scores them.
- **Mutation testing:** Stryker changes that code on purpose; the tests must notice.
- **Security:** lint rules, hostile-input tests, dependency checks and code scanning.
- **Exploratory:** a hands-on pass before each release. See [docs/testing.md](docs/testing.md).

## Licence

Code: [MIT](LICENSE). Questions: [CC BY 4.0](content/LICENSE.md).
