import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig(
	globalIgnores([
		"node_modules",
		"main.js",
		"package-lock.json",
		"versions.json",
		"esbuild.config.mjs",
		"version-bump.mjs",
		"scripts/**/*.mjs",
		".claude/hooks/**/*.mjs",
	]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						"eslint.config.mts",
						"esbuild.config.mjs",
						"version-bump.mjs",
					],
				},
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	...obsidianmd.configs.recommended,
);
