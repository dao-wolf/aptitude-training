# 3. Ship signed, immutable releases

**Status:** accepted, 28 Oct 2026

## Context

Sites embed the built files. They need to know the files came from this repo's
tested build, unchanged.

## Decision

A version tag runs `release.yml`. It builds, runs every test, writes
`SHA256SUMS`, signs build provenance for those files and publishes the release.
Releases are immutable, and a ruleset locks version tags.

## Consequences

- A site can check any file with `gh attestation verify` before using it.
- A fix means a new version. Nobody can edit or replace a published release.
