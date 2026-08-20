# Maintainer workflow

## Ordinary change

1. Update local `main` from GitHub, then create a branch such as `fix/short-description` or `agent/bounded-task`.
2. Give an agent a bounded issue and require it to follow `AGENTS.md`. Claude Code also loads `CLAUDE.md` and the project hooks automatically.
3. Review the diff, especially privacy boundaries, dependency changes, generated `main.js`, and agent-authored tests.
4. Run `npm run validate` and `npm run security:audit`. Test user-facing changes in a disposable Obsidian vault.
5. Push the branch, open a pull request, and wait for Checks, Security, dependency review, and CodeQL.
6. Resolve review findings on the same branch. Merge only when the evidence matches the claimed change.

## Release

1. Use a release-only branch after ordinary changes have landed.
2. Update `package.json`, `manifest.json`, `versions.json`, and `CHANGELOG.md`; rebuild and validate.
3. Merge the reviewed release pull request.
4. Create a strict semver tag matching the manifest version and push that tag.
5. Inspect the draft GitHub release, its three assets, and build attestations before publishing it.

Never create a tag merely to test the release workflow: any tag starts the workflow, while mismatched tags are deliberately rejected.

## GitHub repository settings

After the hardening pull request lands, enable these settings in GitHub:

- Private vulnerability reporting.
- Dependabot alerts and security updates.
- Secret scanning and push protection.
- A `main` branch ruleset that blocks force pushes and deletion, requires a pull request, requires Checks and Security status checks, requires conversations to be resolved, and requires the branch to be up to date.

Keep one owner bypass available for genuine repository recovery. Do not require a second approving person while the repository has only one maintainer; the required pull request and automated gates still preserve review visibility without locking the owner out.
