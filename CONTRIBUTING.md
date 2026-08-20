# Contributing

Thank you for improving Copy Contents. The project deliberately stays small, local-first, and easy to audit.

## Setup

1. Install Node.js 20 or later.
2. Run `npm ci`.
3. Run `npm run setup` once to activate the version-controlled Git hooks.
4. Create a short-lived branch from the current `main` branch.

## Change process

- Open an issue before adding a broad feature, runtime dependency, network access, analytics, or a new data boundary.
- Add or update tests for behavior changes.
- Run `npm run validate` and `npm run security:audit`.
- For UI or vault behavior, load the development build in a test vault and describe the manual scenarios in the pull request.
- Do not include real vault content, credentials, or machine-specific paths in tests or reports.

Pull requests are reviewed before merge. Release metadata and Git tags are maintained separately by the project owner.

See [AGENTS.md](AGENTS.md) for the full product and automation guardrails.
