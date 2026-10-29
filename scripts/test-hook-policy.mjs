import assert from "node:assert/strict";
import { classifyCommand, classifyFilePath } from "../.claude/hooks/policy.mjs";

assert.equal(classifyFilePath("src/core.ts", "/repo").decision, "allow");
assert.equal(classifyFilePath("package.json", "/repo").decision, "ask");
assert.equal(classifyFilePath(".github/workflows/release.yml", "/repo").decision, "ask");
assert.equal(classifyFilePath(".env.local", "/repo").decision, "deny");
assert.equal(classifyFilePath("../outside.txt", "/repo").decision, "deny");

assert.equal(classifyCommand("npm test").decision, "allow");
assert.equal(classifyCommand("git push origin feature/test").decision, "allow");
assert.equal(classifyCommand("git push origin main").decision, "deny");
assert.equal(classifyCommand("git push --force-with-lease origin feature/test").decision, "deny");
assert.equal(classifyCommand("git commit --no-verify -m nope").decision, "deny");
assert.equal(classifyCommand("gh release create 2.0.0").decision, "deny");
assert.equal(classifyCommand("Get-Content .env.local").decision, "deny");
assert.equal(classifyCommand("echo '{}' > package.json").decision, "ask");

console.log("Claude hook policy tests passed.");

// A protected path must not become writable merely by switching tools.
for (const path of ["scripts/check-staged-secrets.mjs", "scripts/setup-hooks.mjs", "scripts/validate-release.mjs"]) {
  assert.equal(classifyCommand(`echo harmless > ${path}`).decision, "ask", path);
}
if (process.platform === "win32") {
  assert.equal(classifyFilePath("C:/outside.txt", "D:/repo").decision, "deny");
}
