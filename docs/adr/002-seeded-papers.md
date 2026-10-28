# 2. Build papers from a seed

**Status:** accepted, 28 Oct 2026

## Context

A paper must be the same every time for the same input, so tests are stable and
people can share or retry a paper.

## Decision

Papers come from a seeded generator (mulberry32). The seed can travel in the
address as a short run of letters and digits. The app ignores anything else.

## Consequences

- Tests pin the generator's output. Changing the algorithm changes every saved
  seed, so it needs a new decision record.
- The seed is the only visitor input in the address. The app checks it against
  an allow-list and never shows it as markup.
