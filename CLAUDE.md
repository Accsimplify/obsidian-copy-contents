@AGENTS.md

## Claude Code workflow

- Begin by reading the issue, relevant source, tests, and current diff. State assumptions before broadening scope.
- Work only on a non-default branch. Ask before editing protected maintainer files; project hooks enforce this.
- Use the `security-reviewer` subagent after changes that affect vault reads/writes, clipboard behavior, parsing, dependencies, workflows, or releases.
- Do not commit, push, open or merge a pull request, create a tag, or publish a release unless Richard explicitly asks for that exact action.
- Finish with a concise handoff: changed files, checks run, unresolved risks, and decisions Richard still owns.
