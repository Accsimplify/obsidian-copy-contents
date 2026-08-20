import { chmodSync } from "node:fs";
import { spawnSync } from "node:child_process";

const configured = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
	stdio: "inherit",
});
if (configured.status !== 0) {
	process.exit(configured.status ?? 1);
}

if (process.platform !== "win32") {
	chmodSync(".githooks/pre-commit", 0o755);
	chmodSync(".githooks/pre-push", 0o755);
}

console.log("Repository Git hooks are active from .githooks/.");
