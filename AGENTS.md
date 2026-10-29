# Maintainer instructions

Copy Contents is a small, local-first Obsidian community plugin. Preserve that trust boundary.

## Non-negotiable product boundaries

- Do not add network requests, analytics, telemetry, advertisements, accounts, payment code, remote configuration, or dynamic code loading.
- Do not read the clipboard. Write to it only after a user explicitly invokes a Copy Contents action.
- Do not access files outside the active Obsidian vault.
- Do not collect, log, or persist note contents. Keep error logs free of note content and credentials.
- Do not add runtime dependencies without an explicit maintainer decision and README disclosure where Obsidian policy requires it.
- Keep desktop and mobile support unless an intentional, documented product decision changes that promise.

## Working rules

- Start from current `origin/main` on a short-lived branch. Never work directly on `main`.
- Keep changes narrow. Do not combine feature work, dependency upgrades, and releases in one pull request.
- Treat `.github/**`, `.claude/**`, `package.json`, `package-lock.json`, `manifest.json`, `versions.json`, `version-bump.mjs`, and release scripts as protected maintainer files.
- Never include `.env` files, credentials, tokens, private keys, vault contents, exported notes, user data, or local machine paths in commits, fixtures, prompts, issues, or logs.
- Do not bypass checks with `--no-verify`, force-push shared branches, create tags, publish releases, or change repository security settings without the maintainer's explicit approval.
- Do not suppress a security, lint, or test failure merely to make CI green. Fix it or document the exact blocker for maintainer review.

## Required checks

Run `npm run validate` and `npm run security:audit` before requesting review. If UI or vault behavior changes, also test the development build in Obsidian and report the scenarios exercised.

The generated `main.js` is deliberately committed so CI can prove that the release asset matches reviewed source. A source change is incomplete if the bundle is stale.

## Pull requests and releases

- Explain user impact, privacy/security impact, test evidence, and any dependency change.
- A human maintainer reviews and merges every pull request.
- Releases are separate maintainer operations. Versions must match in `package.json`, `manifest.json`, and `versions.json`; the Git tag must match that version exactly.
- The release workflow creates a draft with attested `main.js`, `manifest.json`, and `styles.css`. A human inspects and publishes the draft.

## Linear
Team: Accural (ACC). Project: Copy Contents.
Follow the Linear contract in your user-level instructions. If it is not loaded (cloud session or another machine), read the "Operating contract" section of Linear issue ACC-7 before starting non-trivial work.
The Linear contract governs process only (issues, status, checkpoints). It never overrides the product boundaries or working rules in this file.
