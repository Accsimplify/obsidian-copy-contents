import {
	App,
	ButtonComponent,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	TFolder,
} from "obsidian";
import {
	buildExportPath,
	CopyContentsSettings,
	DEFAULT_SETTINGS,
	FileContent,
	formatContent,
	formatTimestamp,
	isPathInsideFolder,
	normalizeExportLocation,
	outputExtension,
	OutputFormat,
	relativePathFromFolder,
} from "./core";

type OutputDestination = "clipboard" | "export";

export default class CopyContentsPlugin extends Plugin {
	settings!: CopyContentsSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
			if (file instanceof TFile) {
				menu.addItem((item) => item
					.setTitle("Copy contents to clipboard")
					.setIcon("copy")
					.onClick(() => this.copyFileContents(file)));
				menu.addItem((item) => item
					.setTitle("Export contents to file")
					.setIcon("file-export")
					.onClick(() => this.exportFileContents(file)));
			} else if (file instanceof TFolder) {
				menu.addItem((item) => item
					.setTitle("Copy folder contents to clipboard")
					.setIcon("copy")
					.onClick(() => this.copyFolderContents(file)));
				menu.addItem((item) => item
					.setTitle("Export folder contents to file")
					.setIcon("file-export")
					.onClick(() => this.exportFolderContents(file)));
			}
		}));

		this.addCommand({
			id: "copy-active-file-contents",
			name: "Copy active file contents to clipboard",
			callback: () => this.withActiveFile((file) => this.copyFileContents(file)),
		});
		this.addCommand({
			id: "copy-current-folder-contents",
			name: "Copy current folder contents to clipboard",
			callback: () => this.withActiveFolder((folder) => this.copyFolderContents(folder)),
		});
		this.addCommand({
			id: "export-active-file-contents",
			name: "Export active file contents to file",
			callback: () => this.withActiveFile((file) => this.exportFileContents(file)),
		});
		this.addCommand({
			id: "export-current-folder-contents",
			name: "Export current folder contents to file",
			callback: () => this.withActiveFolder((folder) => this.exportFolderContents(folder)),
		});

		this.addSettingTab(new CopyContentsSettingTab(this.app, this));
	}

	private async withActiveFile(action: (file: TFile) => Promise<void>): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("No active file");
			return;
		}
		await action(activeFile);
	}

	private async withActiveFolder(action: (folder: TFolder) => Promise<void>): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("No active file");
			return;
		}
		if (!activeFile.parent) {
			new Notice("No parent folder found");
			return;
		}
		await action(activeFile.parent);
	}

	private isValidFile(file: TFile): boolean {
		return this.settings.fileExtensions.includes(file.extension.toLowerCase()) &&
			file.stat.size <= this.settings.maxFileSize * 1024;
	}

	private validateFile(file: TFile): boolean {
		if (file.stat.size > this.settings.maxFileSize * 1024) {
			new Notice(`File too large (>${this.settings.maxFileSize} KB). Skipping.`);
			return false;
		}
		if (!this.settings.fileExtensions.includes(file.extension.toLowerCase())) {
			new Notice(`File type .${file.extension.toLowerCase()} not supported`);
			return false;
		}
		return true;
	}

	private async copyFileContents(file: TFile): Promise<void> {
		try {
			if (!this.validateFile(file)) {
				return;
			}
			const content = await this.app.vault.read(file);
			const output = formatContent(this.settings, [{
				name: file.name,
				path: file.path,
				content,
				size: file.stat.size,
			}]);
			await navigator.clipboard.writeText(output);
			new Notice(`Copied "${file.name}" (${this.sizeInKilobytes(file.stat.size)} KB) to clipboard`);
		} catch (error) {
			console.error("Copy Contents: failed to copy file contents", error);
			new Notice("Failed to copy file contents");
		}
	}

	private async copyFolderContents(folder: TFolder): Promise<void> {
		await this.handleFolder(folder, "clipboard");
	}

	private async exportFileContents(file: TFile): Promise<void> {
		try {
			if (!this.validateFile(file)) {
				return;
			}
			const content = await this.app.vault.read(file);
			const output = formatContent(this.settings, [{
				name: file.name,
				path: file.path,
				content,
				size: file.stat.size,
			}]);
			const exportPath = await this.createExportPath(file.basename);
			await this.app.vault.create(exportPath, output);
			new Notice(`Exported "${file.name}" (${this.sizeInKilobytes(file.stat.size)} KB) to ${exportPath}`);
		} catch (error) {
			console.error("Copy Contents: failed to export file contents", error);
			new Notice("Failed to export file contents");
		}
	}

	private async exportFolderContents(folder: TFolder): Promise<void> {
		await this.handleFolder(folder, "export");
	}

	private async handleFolder(folder: TFolder, destination: OutputDestination): Promise<void> {
		try {
			const exportFolder = normalizeExportLocation(this.settings.exportLocation);
			const files = this.getAllFilesInFolder(folder)
				.filter((file) => this.isValidFile(file))
				.filter((file) => destination !== "export" || !isPathInsideFolder(file.path, exportFolder))
				.sort((left, right) => left.path.localeCompare(right.path));

			if (files.length === 0) {
				new Notice("No valid files found in folder");
				return;
			}

			let selectedFiles = files;
			if (this.settings.showSelectionModal && files.length >= this.settings.selectionThreshold) {
				const selection = await this.selectFiles(files, destination);
				if (selection === null) {
					return;
				}
				if (selection.length === 0) {
					new Notice("No files selected");
					return;
				}
				selectedFiles = selection;
			}

			await this.processSelectedFiles(selectedFiles, folder, destination);
		} catch (error) {
			console.error(`Copy Contents: failed to ${destination} folder contents`, error);
			new Notice(`Failed to ${destination === "clipboard" ? "copy" : "export"} folder contents`);
		}
	}

	private selectFiles(files: TFile[], destination: OutputDestination): Promise<TFile[] | null> {
		return new Promise((resolve) => {
			new FileSelectionModal(
				this.app,
				files,
				destination === "clipboard" ? "Copy selected" : "Export selected",
				resolve,
			).open();
		});
	}

	private async processSelectedFiles(
		files: TFile[],
		folder: TFolder,
		destination: OutputDestination,
	): Promise<void> {
		const fileContents: FileContent[] = [];
		for (const file of files) {
			try {
				fileContents.push({
					name: file.name,
					path: relativePathFromFolder(file.path, folder.path),
					content: await this.app.vault.read(file),
					size: file.stat.size,
				});
			} catch (error) {
				console.error(`Copy Contents: failed to read ${file.path}`, error);
				fileContents.push({
					name: file.name,
					path: relativePathFromFolder(file.path, folder.path),
					content: "*Error reading file*",
					size: 0,
				});
			}
		}

		const folderName = folder.name || "Vault";
		const output = formatContent(this.settings, fileContents, folderName);
		const totalSize = files.reduce((sum, file) => sum + file.stat.size, 0);
		const summary = `${files.length} files (${this.sizeInKilobytes(totalSize)} KB) from "${folderName}"`;

		if (destination === "clipboard") {
			await navigator.clipboard.writeText(output);
			new Notice(`Copied ${summary} to clipboard`);
			return;
		}

		const exportPath = await this.createExportPath(`${folderName}-contents`);
		await this.app.vault.create(exportPath, output);
		new Notice(`Exported ${summary} to ${exportPath}`);
	}

	private async createExportPath(baseName: string): Promise<string> {
		const exportFolder = normalizeExportLocation(this.settings.exportLocation);
		if (!await this.app.vault.adapter.exists(exportFolder)) {
			await this.app.vault.createFolder(exportFolder);
		}

		const timestamp = this.settings.includeTimestamp ? formatTimestamp(new Date()) : null;
		const extension = outputExtension(this.settings.outputFormat);
		let counter = 0;
		let path = buildExportPath(exportFolder, baseName, extension, timestamp, counter);

		while (await this.app.vault.adapter.exists(path)) {
			counter += 1;
			path = buildExportPath(exportFolder, baseName, extension, timestamp, counter);
		}
		return path;
	}

	private getAllFilesInFolder(folder: TFolder): TFile[] {
		return folder.children.flatMap((child) => {
			if (child instanceof TFile) {
				return [child];
			}
			if (child instanceof TFolder) {
				return this.getAllFilesInFolder(child);
			}
			return [];
		});
	}

	private sizeInKilobytes(bytes: number): string {
		return (bytes / 1024).toFixed(1);
	}

	private async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<CopyContentsSettings>);
		this.settings.exportLocation = normalizeExportLocation(this.settings.exportLocation);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}

class FileSelectionModal extends Modal {
	private readonly selectedFiles = new Set<TFile>();
	private settled = false;

	constructor(
		app: App,
		private readonly files: TFile[],
		private readonly actionLabel: string,
		private readonly onChoose: (files: TFile[] | null) => void,
	) {
		super(app);
		this.files.forEach((file) => this.selectedFiles.add(file));
	}

	onOpen(): void {
		this.contentEl.empty();
		this.setTitle("Select files");
		this.contentEl.createEl("p", {
			text: `Found ${this.files.length} files. Select which ones to include:`,
			cls: "setting-item-description",
		});

		const buttonContainer = this.contentEl.createDiv({ cls: "copy-contents-button-container" });
		new ButtonComponent(buttonContainer)
			.setButtonText("Select all")
			.onClick(() => {
				this.files.forEach((file) => this.selectedFiles.add(file));
				this.updateCheckboxes();
			});
		new ButtonComponent(buttonContainer)
			.setButtonText("Select none")
			.onClick(() => {
				this.selectedFiles.clear();
				this.updateCheckboxes();
			});

		const fileListContainer = this.contentEl.createDiv({ cls: "copy-contents-file-list" });
		for (const file of this.files) {
			const fileItem = fileListContainer.createDiv({ cls: "copy-contents-file-item" });
			const checkbox = fileItem.createEl("input", {
				type: "checkbox",
				cls: "copy-contents-checkbox",
			});
			checkbox.checked = this.selectedFiles.has(file);
			checkbox.addEventListener("change", () => {
				if (checkbox.checked) {
					this.selectedFiles.add(file);
				} else {
					this.selectedFiles.delete(file);
				}
			});

			const fileInfo = fileItem.createDiv({ cls: "copy-contents-file-info" });
			fileInfo.createDiv({ text: file.name, cls: "copy-contents-file-name" });
			fileInfo.createDiv({
				text: `${file.path} • ${(file.stat.size / 1024).toFixed(1)} KB`,
				cls: "copy-contents-file-details",
			});
		}

		const actionContainer = this.contentEl.createDiv({ cls: "copy-contents-actions" });
		new ButtonComponent(actionContainer)
			.setButtonText("Cancel")
			.onClick(() => this.close());
		new ButtonComponent(actionContainer)
			.setButtonText(this.actionLabel)
			.setCta()
			.onClick(() => {
				this.complete(Array.from(this.selectedFiles));
				this.close();
			});
	}

	onClose(): void {
		this.complete(null);
		this.contentEl.empty();
	}

	private complete(files: TFile[] | null): void {
		if (this.settled) {
			return;
		}
		this.settled = true;
		this.onChoose(files);
	}

	private updateCheckboxes(): void {
		const checkboxes = this.contentEl.querySelectorAll<HTMLInputElement>(
			'input[type="checkbox"]',
		);
		checkboxes.forEach((checkbox, index) => {
			const file = this.files[index];
			checkbox.checked = file ? this.selectedFiles.has(file) : false;
		});
	}
}

class CopyContentsSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly copyContentsPlugin: CopyContentsPlugin) {
		super(app, copyContentsPlugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Output format")
			.setDesc("Choose how content is formatted when copied or exported.")
			.addDropdown((dropdown) => dropdown
				.addOption("markdown", "Markdown")
				.addOption("plaintext", "Plain text")
				.addOption("json", "JSON")
				.setValue(this.copyContentsPlugin.settings.outputFormat)
				.onChange(async (value) => {
					this.copyContentsPlugin.settings.outputFormat = value as OutputFormat;
					await this.copyContentsPlugin.saveSettings();
				}));

		new Setting(containerEl).setName("Content").setHeading();
		new Setting(containerEl)
			.setName("Include file names")
			.setDesc("Add file names as headers.")
			.addToggle((toggle) => toggle
				.setValue(this.copyContentsPlugin.settings.includeFileNames)
				.onChange(async (value) => {
					this.copyContentsPlugin.settings.includeFileNames = value;
					await this.copyContentsPlugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName("Include folder structure")
			.setDesc("Add the folder name as the main header.")
			.addToggle((toggle) => toggle
				.setValue(this.copyContentsPlugin.settings.includeFolderStructure)
				.onChange(async (value) => {
					this.copyContentsPlugin.settings.includeFolderStructure = value;
					await this.copyContentsPlugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName("Custom separator")
			.setDesc("Text used between files in Markdown and plain text output.")
			.addText((text) => text
				.setPlaceholder("---")
				.setValue(this.copyContentsPlugin.settings.customSeparator)
				.onChange(async (value) => {
					this.copyContentsPlugin.settings.customSeparator = value || "---";
					await this.copyContentsPlugin.saveSettings();
				}));

		new Setting(containerEl).setName("File filtering").setHeading();
		new Setting(containerEl)
			.setName("Maximum file size")
			.setDesc("Skip files larger than the configured size.")
			.addText((text) => text
				.setPlaceholder("1000")
				.setValue(String(this.copyContentsPlugin.settings.maxFileSize))
				.onChange(async (value) => {
					const size = Number.parseInt(value, 10);
					if (Number.isFinite(size) && size > 0) {
						this.copyContentsPlugin.settings.maxFileSize = size;
						await this.copyContentsPlugin.saveSettings();
					}
				}));
		new Setting(containerEl)
			.setName("Supported file extensions")
			.setDesc("Comma-separated file extensions to include.")
			.addText((text) => text
				.setValue(this.copyContentsPlugin.settings.fileExtensions.join(","))
				.onChange(async (value) => {
					this.copyContentsPlugin.settings.fileExtensions = value
						.split(",")
						.map((extension) => extension.trim().toLowerCase().replace(/^\./, ""))
						.filter((extension) => extension.length > 0);
					await this.copyContentsPlugin.saveSettings();
				}));

		new Setting(containerEl).setName("File selection").setHeading();
		new Setting(containerEl)
			.setName("Show file selection modal")
			.setDesc("Choose files before processing a large folder.")
			.addToggle((toggle) => toggle
				.setValue(this.copyContentsPlugin.settings.showSelectionModal)
				.onChange(async (value) => {
					this.copyContentsPlugin.settings.showSelectionModal = value;
					await this.copyContentsPlugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName("Selection threshold")
			.setDesc("Number of files that opens the selection modal.")
			.addText((text) => text
				.setPlaceholder("10")
				.setValue(String(this.copyContentsPlugin.settings.selectionThreshold))
				.onChange(async (value) => {
					const threshold = Number.parseInt(value, 10);
					if (Number.isFinite(threshold) && threshold > 0) {
						this.copyContentsPlugin.settings.selectionThreshold = threshold;
						await this.copyContentsPlugin.saveSettings();
					}
				}));

		new Setting(containerEl).setName("Export").setHeading();
		new Setting(containerEl)
			.setName("Export folder")
			.setDesc("Vault folder where exported files are saved.")
			.addText((text) => text
				.setPlaceholder("Exports")
				.setValue(this.copyContentsPlugin.settings.exportLocation)
				.onChange(async (value) => {
					this.copyContentsPlugin.settings.exportLocation = normalizeExportLocation(value);
					await this.copyContentsPlugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName("Include timestamp in file name")
			.setDesc("Add a timestamp to exported file names.")
			.addToggle((toggle) => toggle
				.setValue(this.copyContentsPlugin.settings.includeTimestamp)
				.onChange(async (value) => {
					this.copyContentsPlugin.settings.includeTimestamp = value;
					await this.copyContentsPlugin.saveSettings();
				}));
	}
}
