# 3. Ship signed, immutable releases

**Status:** accepted, 28 Oct 2026

## Context

Sites embed the built files. They need to know the files came from this repo's
tested build, unchanged.

## Decision

A version tag runs `release.yml`. It builds, runs every test, writes
`SHA256SUMS`, signs build provenance for those files and publishes the release.
Releases are immutable, and a ruleset locks version tags.

The same run stages `@daowolf/aptitude-training` on npm by trusted
publishing: npm checks the workflow's identity, so the repo stores no token. The tag
must match `package.json`'s version. A staged version stays hidden until the
maintainer approves it on npmjs.com with two-factor sign-in. The trusted publisher
allows staged publishing only, and the package refuses tokens.

## Consequences

- A site can check any file with `gh attestation verify`, or install the
  package from npm, where its provenance shows which build made it.
- A fix means a new version. Nobody can edit or replace a published release.
- A green release run isn't a finished release. The version reaches npm only
  after the maintainer approves it. Until then, sites can't install it.
