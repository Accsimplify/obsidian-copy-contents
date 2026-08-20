import { relative, resolve, sep } from "node:path";

const PROTECTED_PATHS = [
	".claude/",
	".github/",
	".githooks/",
	"agents.md",
	"claude.md",
	"manifest.json",
	"package.json",
	"package-lock.json",
	"scripts/check-staged-secrets.mjs",
	"scripts/setup-hooks.mjs",
	"scripts/validate-release.mjs",
	"version-bump.mjs",
	"versions.json",
];

const SENSITIVE_PATH_PATTERNS = [
	/(^|\/)\.env(?:\.|$)/i,
	/(^|\/)(?:credentials?|secrets?)(?:\.|\/|$)/i,
	/\.(?:key|pem|p12|pfx)$/i,
	/(^|\/)id_(?:rsa|dsa|ecdsa|ed25519)$/i,
];

const BLOCKED_COMMANDS = [
	{ pattern: /\b(?:cat|type|get-content|gc|more|less|head|tail|grep|rg)\b[^\r\n]*(?:\.env(?:\.|\s|$)|credentials?|secrets?|\.(?:pem|key|p12|pfx)(?:\s|$))/i, reason: "Shell reads of likely credential files are blocked; use synthetic fixtures instead." },
	{ pattern: /\b(?:node|python(?:3)?|powershell|pwsh)\b[^\r\n]*(?:\.env(?:\.|\s|$)|credentials?|secrets?|\.(?:pem|key|p12|pfx)(?:\s|$))/i, reason: "Interpreter access to likely credential files is blocked; use synthetic fixtures instead." },
	{ pattern: /\bgit\s+(?:-[^\s]+\s+)*push\b[^\r\n]*(?:--force(?:-with-lease)?|-f(?:\s|$))/i, reason: "Force-pushing is a maintainer-only recovery action." },
	{ pattern: /\bgit\s+(?:-[^\s]+\s+)*push\b[^\r\n]*(?:\borigin\s+main\b|\bHEAD:main\b|--tags\b)/i, reason: "Direct pushes to main and tag pushes are forbidden; use a reviewed pull request." },
	{ pattern: /\bgit\s+(?:-[^\s]+\s+)*tag\b/i, reason: "Tags trigger releases and require explicit maintainer approval." },
	{ pattern: /\bgh\s+(?:-[^\s]+\s+)*release\b/i, reason: "GitHub releases are maintainer-controlled." },
	{ pattern: /\bnpm\s+(?:--[^\s]+\s+)*(?:publish|version)\b/i, reason: "Publishing and versioning are maintainer-controlled." },
	{ pattern: /\bgit\s+(?:-[^\s]+\s+)*(?:reset\s+--hard|clean\s+-[^\s]*f|checkout\s+--|restore\b[^\r\n]*\s--source)/i, reason: "Destructive Git operations require a human recovery decision." },
	{ pattern: /(?:^|\s)--no-verify(?:\s|$)/i, reason: "Repository verification hooks may not be bypassed." },
];

const PROTECTED_SHELL_EDIT = /(?:>|>>|\b(?:set-content|add-content|out-file|sed\s+-i|perl\s+-pi|python(?:3)?\s+-c|node\s+-e)\b)[^\r\n]*(?:\.claude[\\/]|\.github[\\/]|\.githooks[\\/]|agents\.md|claude\.md|manifest\.json|package(?:-lock)?\.json|versions\.json|version-bump\.mjs)/i;

export function normalizeProjectPath(filePath, cwd = process.cwd()) {
	const absolute = resolve(cwd, filePath);
	const projectRelative = relative(cwd, absolute);
	if (projectRelative.startsWith(`..${sep}`) || projectRelative === "..") {
		return `../${projectRelative.replaceAll(sep, "/")}`;
	}
	return projectRelative.replaceAll(sep, "/").toLowerCase();
}

export function classifyFilePath(filePath, cwd = process.cwd()) {
	const normalized = normalizeProjectPath(filePath, cwd);
	if (normalized.startsWith("../") || SENSITIVE_PATH_PATTERNS.some((pattern) => pattern.test(normalized))) {
		return { decision: "deny", reason: `Sensitive or out-of-project path is blocked: ${normalized}` };
	}
	if (PROTECTED_PATHS.some((path) => normalized === path || (path.endsWith("/") && normalized.startsWith(path)))) {
		return { decision: "ask", reason: `Maintainer approval is required to edit protected file: ${normalized}` };
	}
	return { decision: "allow" };
}

export function classifyCommand(command) {
	for (const blocked of BLOCKED_COMMANDS) {
		if (blocked.pattern.test(command)) {
			return { decision: "deny", reason: blocked.reason };
		}
	}
	if (PROTECTED_SHELL_EDIT.test(command)) {
		return { decision: "ask", reason: "Maintainer approval is required for shell edits to protected repository files." };
	}
	return { decision: "allow" };
}
