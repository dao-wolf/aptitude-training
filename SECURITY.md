# Security

## Reporting a problem

Please report security problems privately through
[GitHub's private reporting](https://github.com/dao-wolf/aptitude-training/security/advisories/new),
not in a public issue. Only the latest release gets fixes.

## What could go wrong

The app runs only in your browser. It has no server and no accounts.

- **Inputs:** a paper's seed in the address, saved progress in the browser, and
  the element's attributes. The app checks each one before use.
- **Content:** everything shows as plain text. Nothing writes raw HTML.
- **Supply chain:** automated tools scan the dependencies and workflows, and
  GitHub signs each release, so a site using it can check where it came from.
