import { spawnSync } from "node:child_process";

const diff = spawnSync("git", ["diff", "--cached", "--no-ext-diff", "--unified=0", "--no-color"], {
	encoding: "utf8",
});

if (diff.status !== 0) {
	console.error("Unable to inspect staged changes for secrets.");
	process.exit(1);
}

const privateKeyMarker = "-----BEGIN " + "PRIVATE KEY-----";
const patterns = [
	{ name: "private key", pattern: new RegExp(privateKeyMarker) },
	{ name: "GitHub token", pattern: /gh[pousr]_[A-Za-z0-9_]{30,}/ },
	{ name: "AWS access key", pattern: /(?:AKIA|ASIA)[A-Z0-9]{16}/ },
	{ name: "Anthropic API key", pattern: /sk-ant-[A-Za-z0-9_-]{20,}/ },
	{ name: "OpenAI-style API key", pattern: /sk-[A-Za-z0-9_-]{32,}/ },
];

const findings = [];
let currentFile = "unknown";
for (const line of diff.stdout.split(/\r?\n/)) {
	if (line.startsWith("+++ b/")) {
		currentFile = line.slice(6);
		continue;
	}
	if (!line.startsWith("+") || line.startsWith("+++")) {
		continue;
	}
	if (line.includes("secret-scan: allow")) {
		continue;
	}
	for (const candidate of patterns) {
		if (candidate.pattern.test(line.slice(1))) {
			findings.push(`${currentFile}: possible ${candidate.name}`);
		}
	}
}

if (findings.length > 0) {
	console.error("Possible secrets detected in staged changes:");
	console.error(findings.map((finding) => `- ${finding}`).join("\n"));
	console.error("Remove the value. For a deliberate test fixture, add 'secret-scan: allow' on that line and explain it in review.");
	process.exit(1);
}

console.log("No likely secrets detected in staged changes.");
