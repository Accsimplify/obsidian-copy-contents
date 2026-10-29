import { spawnSync } from "node:child_process";

let input = "";
for await (const chunk of process.stdin) {
	input += chunk;
}

let event;
try {
	event = JSON.parse(input);
} catch (error) {
	console.error(`Stop validation could not parse hook input: ${error instanceof Error ? error.message : String(error)}`);
	process.exit(2);
}

if (event.stop_hook_active === true) {
	process.exit(0);
}

const status = spawnSync("git", ["status", "--porcelain", "--untracked-files=normal"], {
	cwd: event.cwd ?? process.cwd(),
	encoding: "utf8",
});

if (status.status !== 0) {
	console.error("Unable to inspect the worktree before Claude stopped.");
	process.exit(2);
}
if (status.stdout.trim().length === 0) {
	process.exit(0);
}

const windows = process.platform === "win32";
const npmCommand = windows ? (process.env.ComSpec || "cmd.exe") : "npm";
const npmArgs = windows ? ["/d", "/s", "/c", "npm run validate"] : ["run", "validate"];
const validation = spawnSync(npmCommand, npmArgs, {
	cwd: event.cwd ?? process.cwd(),
	encoding: "utf8",
	stdio: "pipe",
	timeout: 170_000,
});

if (validation.status !== 0) {
	console.error("Claude cannot finish because npm run validate failed. Fix the failure or report the exact blocker.\n");
	if (validation.error) console.error(validation.error.message);
	console.error(validation.stdout);
	console.error(validation.stderr);
	process.exit(2);
}
