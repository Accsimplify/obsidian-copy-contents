import { existsSync, readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const versions = JSON.parse(readFileSync("versions.json", "utf8"));
const failures = [];

if (manifest.version !== packageJson.version) {
	failures.push(`Version mismatch: manifest ${manifest.version}, package ${packageJson.version}`);
}
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
	failures.push(`Manifest version must be strict semver: ${manifest.version}`);
}
if (versions[manifest.version] !== manifest.minAppVersion) {
	failures.push(`versions.json does not map ${manifest.version} to ${manifest.minAppVersion}`);
}
if (process.env.GITHUB_REF_TYPE === "tag" && process.env.GITHUB_REF_NAME !== manifest.version) {
	failures.push(`Release tag ${process.env.GITHUB_REF_NAME} does not match manifest ${manifest.version}`);
}
if (!manifest.description.endsWith(".")) {
	failures.push("Manifest description must end with a period");
}
if (manifest.description.length > 250) {
	failures.push("Manifest description must be at most 250 characters");
}
for (const requiredFile of ["main.js", "manifest.json", "styles.css"]) {
	if (!existsSync(requiredFile)) {
		failures.push(`Missing release asset: ${requiredFile}`);
	}
}
if (packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0) {
	failures.push("Runtime dependencies must be reviewed before release; bundle only what the plugin needs");
}
if (existsSync("syles.css")) {
	failures.push("Misspelled syles.css still exists");
}

if (failures.length > 0) {
	console.error(failures.map((failure) => `- ${failure}`).join("\n"));
	process.exitCode = 1;
} else {
	console.log(`Release metadata and assets are valid for ${manifest.version}.`);
}
