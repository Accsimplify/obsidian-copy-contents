# Security policy

## Supported version

Security fixes target the latest released version of Copy Contents.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability or include vault contents, credentials, or personal data in a report. Use GitHub's **Report a vulnerability** option on the repository Security tab. If private vulnerability reporting is not available, contact the maintainer through the profile linked from the repository and share only enough information to establish a private reporting channel.

Include the affected version, impact, reproduction steps using synthetic data, and any suggested mitigation. You should receive an acknowledgement within seven days.

## Security model

Copy Contents operates locally inside Obsidian. It reads selected vault files, writes exports inside the vault, and writes to the clipboard only after an explicit user action. It does not read the clipboard, make network requests, run analytics, or monitor activity in the background.
