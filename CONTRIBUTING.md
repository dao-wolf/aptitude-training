# Contributing

Thanks for helping. Small, focused pull requests are easiest to review.

## Set up

```sh
pnpm install
pnpm exec playwright install chromium
pnpm check
```

## How we work

1. Start from the outside: write a failing Playwright journey for the change.
2. Add a failing unit test underneath, then make both pass.
3. Keep tests about behaviour. Don't test styles or component internals.

See [docs/testing.md](docs/testing.md) for the test layers, the rules and the
exploratory checklist we run before each release.

## Questions

- Write every question yourself. Never copy or reword one from a real test,
  a prep site or a book.
- Follow `docs/writing-questions.md`: one right answer, plausible wrong ones,
  plain words.
- New questions start as drafts. They go live only after a second person
  solves them without seeing the answer.

## Found a wrong answer?

Use the [Report a wrong answer](https://github.com/dao-wolf/aptitude-training/issues/new?template=wrong-answer.yml) form.

## Licence

By contributing, you license your code under MIT and your questions under
CC BY 4.0.
