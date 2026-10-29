import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const hook = resolve(".claude/hooks/stop-validate.mjs");
const fixture = mkdtempSync(join(tmpdir(), "copy-contents-stop-hook-"));
try {
  const init = spawnSync("git", ["init", "--quiet"], { cwd: fixture, encoding: "utf8" });
  assert.equal(init.status, 0, init.stderr);
  writeFileSync(join(fixture, "package.json"), JSON.stringify({ scripts: { validate: "node check.cjs" } }));
  for (const expected of [0, 1]) {
    const marker = `ran-${expected}`;
    writeFileSync(join(fixture, "check.cjs"), `require('node:fs').writeFileSync('${marker}', 'yes'); process.exit(${expected});`);
    const run = spawnSync(process.execPath, [hook], {
      cwd: fixture,
      input: JSON.stringify({ cwd: fixture }),
      encoding: "utf8",
      timeout: 30000,
    });
    assert.ok(existsSync(join(fixture, marker)), `validation did not execute: ${run.error ?? run.stderr}`);
    assert.equal(run.status, expected === 0 ? 0 : 2, run.stderr);
  }
  console.log("Stop hook executes validation and propagates failure.");
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
