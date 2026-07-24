export type OutputFormat = "markdown" | "plaintext" | "json";

export interface CopyContentsSettings {
	includeFolderStructure: boolean;
	includeFileNames: boolean;
	maxFileSize: number;
	fileExtensions: string[];
	outputFormat: OutputFormat;
	customSeparator: string;
	showSelectionModal: boolean;
	selectionThreshold: number;
	exportLocation: string;
	includeTimestamp: boolean;
}

export interface FileContent {
	name: string;
	path: string;
	content: string;
	size: number;
}

export const DEFAULT_SETTINGS: CopyContentsSettings = {
	includeFolderStructure: true,
	includeFileNames: true,
	maxFileSize: 1000,
	fileExtensions: ["md", "txt", "json", "csv", "js", "ts", "py"],
	outputFormat: "markdown",
	customSeparator: "---",
	showSelectionModal: true,
	selectionThreshold: 10,
	exportLocation: "Exports",
	includeTimestamp: true,
};

export function relativePathFromFolder(filePath: string, folderPath: string): string {
	const normalizedFilePath = filePath.replaceAll("\\", "/");
	const normalizedFolderPath = folderPath.replaceAll("\\", "/").replace(/^\/|\/$/g, "");

	if (normalizedFolderPath.length === 0) {
		return normalizedFilePath.replace(/^\//, "");
	}

	const prefix = `${normalizedFolderPath}/`;
	return normalizedFilePath.startsWith(prefix)
		? normalizedFilePath.slice(prefix.length)
		: normalizedFilePath;
}

export function normalizeExportLocation(value: string): string {
	const segments = value
		.trim()
		.replaceAll("\\", "/")
		.split("/")
		.map((segment) => segment.trim())
		.filter((segment) => segment.length > 0 && segment !== "." && segment !== "..");

	return segments
		.map((segment) => segment.replace(/[<>:"|?*]/g, "-"))
		.join("/") || "Exports";
}

export function parseFileExtensions(value: string): string[] {
	return value
		.split(",")
		.map((extension) => extension.trim().toLowerCase().replace(/^\./, ""))
		.filter((extension) => extension.length > 0);
}

export function isPathInsideFolder(path: string, folderPath: string): boolean {
	const normalizedPath = path.replaceAll("\\", "/").replace(/^\/|\/$/g, "");
	const normalizedFolder = folderPath.replaceAll("\\", "/").replace(/^\/|\/$/g, "");

	return normalizedFolder.length > 0 &&
		(normalizedPath === normalizedFolder || normalizedPath.startsWith(`${normalizedFolder}/`));
}

export function sanitizeExportBaseName(value: string): string {
	const sanitized = value
		.split("")
		.map((character) => character.charCodeAt(0) < 32 ? "-" : character)
		.join("")
		.replace(/[<>:"/\\|?*]/g, "-")
		.replace(/[. ]+$/g, "")
		.trim();

	return sanitized || "export";
}

export function formatTimestamp(date: Date): string {
	return date.toISOString().replace(/[:.]/g, "-").slice(0, -5);
}

export function outputExtension(format: OutputFormat): "json" | "txt" | "md" {
	switch (format) {
		case "json":
			return "json";
		case "plaintext":
			return "txt";
		case "markdown":
			return "md";
	}
}

export function buildExportPath(
	exportFolder: string,
	baseName: string,
	extension: string,
	timestamp: string | null,
	counter = 0,
): string {
	const suffix = [timestamp, counter > 0 ? String(counter) : null]
		.filter((part): part is string => part !== null)
		.join("-");
	const fileName = suffix.length > 0
		? `${sanitizeExportBaseName(baseName)}-${suffix}`
		: sanitizeExportBaseName(baseName);

	return `${normalizeExportLocation(exportFolder)}/${fileName}.${extension}`;
}

export function stripMarkdown(content: string): string {
	return content
		.replace(/```[\s\S]*?```/g, "[CODE BLOCK]")
		.replace(/#{1,6}\s+/g, "")
		.replace(/\*\*(.*?)\*\*/g, "$1")
		.replace(/\*(.*?)\*/g, "$1")
		.replace(/`(.*?)`/g, "$1")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

export function formatContent(
	settings: CopyContentsSettings,
	fileContents: FileContent[],
	folderName?: string,
	now = new Date(),
): string {
	switch (settings.outputFormat) {
		case "json":
			return JSON.stringify({
				folder: folderName ?? null,
				timestamp: now.toISOString(),
				fileCount: fileContents.length,
				totalSize: fileContents.reduce((sum, file) => sum + file.size, 0),
				files: fileContents,
			}, null, 2);
		case "plaintext":
			return formatPlainText(settings, fileContents, folderName);
		case "markdown":
			return formatMarkdown(settings, fileContents, folderName);
	}
}

function formatMarkdown(
	settings: CopyContentsSettings,
	fileContents: FileContent[],
	folderName?: string,
): string {
	const fileBlocks: string[] = [];

	for (const file of fileContents) {
		const fileParts: string[] = [];
		if (settings.includeFileNames) {
			fileParts.push(`${folderName ? "##" : "#"} ${file.path}`);
		}
		fileParts.push(file.content);
		fileBlocks.push(fileParts.join("\n\n"));
	}

	const formattedFiles = fileBlocks.join(`\n\n${settings.customSeparator}\n\n`);
	return folderName && settings.includeFolderStructure
		? `# Folder: ${folderName}\n\n${formattedFiles}`
		: formattedFiles;
}

function formatPlainText(
	settings: CopyContentsSettings,
	fileContents: FileContent[],
	folderName?: string,
): string {
	const fileBlocks: string[] = [];

	for (const file of fileContents) {
		const fileParts: string[] = [];
		if (settings.includeFileNames) {
			fileParts.push(`FILE: ${file.path}`);
		}
		fileParts.push(stripMarkdown(file.content));
		fileBlocks.push(fileParts.join("\n\n"));
	}

	const formattedFiles = fileBlocks.join(`\n\n${settings.customSeparator}\n\n`);
	return folderName && settings.includeFolderStructure
		? `FOLDER: ${folderName.toUpperCase()}\n\n${formattedFiles}`
		: formattedFiles;
}
