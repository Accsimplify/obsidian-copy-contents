import { describe, expect, it } from "vitest";
import {
	buildExportPath,
	CopyContentsSettings,
	DEFAULT_SETTINGS,
	formatContent,
	isPathInsideFolder,
	normalizeExportLocation,
	relativePathFromFolder,
	sanitizeExportBaseName,
	stripMarkdown,
} from "../src/core";

function settings(overrides: Partial<CopyContentsSettings> = {}): CopyContentsSettings {
	return { ...DEFAULT_SETTINGS, ...overrides };
}

describe("folder paths", () => {
	it("keeps the nested path relative to the selected folder", () => {
		expect(relativePathFromFolder(
			"Research/Project A/Sources/note.md",
			"Research/Project A",
		)).toBe("Sources/note.md");
	});

	it("supports the vault root", () => {
		expect(relativePathFromFolder("Research/note.md", "/")).toBe("Research/note.md");
	});

	it("normalizes export locations and removes traversal segments", () => {
		expect(normalizeExportLocation(" /Exports\\LLM/../ ")).toBe("Exports/LLM");
		expect(normalizeExportLocation("Exports/Project: Alpha")).toBe("Exports/Project- Alpha");
		expect(normalizeExportLocation("")).toBe("Exports");
	});

	it("checks path boundaries rather than partial names", () => {
		expect(isPathInsideFolder("Exports/note.md", "Exports")).toBe(true);
		expect(isPathInsideFolder("Exports-old/note.md", "Exports")).toBe(false);
	});
});

describe("export paths", () => {
	it("builds stable names for timestamp and conflict variants", () => {
		expect(buildExportPath("Exports", "Project", "md", "2026-07-24T10-20-30", 0))
			.toBe("Exports/Project-2026-07-24T10-20-30.md");
		expect(buildExportPath("Exports", "Project", "md", "2026-07-24T10-20-30", 2))
			.toBe("Exports/Project-2026-07-24T10-20-30-2.md");
	});

	it("sanitizes invalid filename characters", () => {
		expect(sanitizeExportBaseName('A: "plan"?')).toBe("A- -plan--");
	});
});

describe("output formatting", () => {
	const files = [
		{
			name: "note.md",
			path: "Sources/note.md",
			content: "# Finding\n\nA **useful** [source](https://example.com).",
			size: 42,
		},
	];

	it("renders nested paths in Markdown output", () => {
		expect(formatContent(settings(), files, "Project"))
			.toBe("# Folder: Project\n\n## Sources/note.md\n\n# Finding\n\nA **useful** [source](https://example.com).");
	});

	it("replaces fenced code before stripping inline formatting", () => {
		expect(stripMarkdown("Before\n```ts\nconst x = `a`;\n```\nAfter"))
			.toBe("Before\n[CODE BLOCK]\nAfter");
	});

	it("renders deterministic JSON metadata", () => {
		const output = formatContent(
			settings({ outputFormat: "json" }),
			files,
			"Project",
			new Date("2026-07-24T10:00:00.000Z"),
		);
		expect(JSON.parse(output)).toMatchObject({
			folder: "Project",
			timestamp: "2026-07-24T10:00:00.000Z",
			fileCount: 1,
			totalSize: 42,
		});
	});
});
