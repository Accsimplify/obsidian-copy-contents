## What changed

Describe the user-visible change and why it is needed.

## Risk and privacy

- [ ] No network access, telemetry, dynamic code, external file access, or clipboard reading was added.
- [ ] Any clipboard writing remains directly initiated by the user.
- [ ] New or changed dependencies are necessary, maintained, and reviewed.
- [ ] Release metadata was changed only if this is an intentional release PR.

## Verification

- [ ] `npm run validate`
- [ ] `npm run security:audit`
- [ ] Manual Obsidian test completed when UI or vault behavior changed.
- [ ] Generated `main.js` matches the source change.
