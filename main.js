const { Plugin, TFile, TFolder, Notice, Menu, Modal, Setting, ButtonComponent, PluginSettingTab } = require('obsidian');

const DEFAULT_SETTINGS = {
    includeFolderStructure: true,
    includeFileNames: true,
    maxFileSize: 1000,
    fileExtensions: ['md', 'txt', 'json', 'csv', 'js', 'ts', 'py'],
    outputFormat: 'markdown',
    customSeparator: '---',
    showSelectionModal: true,
    selectionThreshold: 10,
    exportLocation: 'Exports',
    includeTimestamp: true
};

class CopyContentsPlugin extends Plugin {
    async onload() {
        await this.loadSettings();

        // Register context menu for files
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                if (file instanceof TFile) {
                    menu.addItem((item) => {
                        item
                            .setTitle('Copy contents to clipboard')
                            .setIcon('copy')
                            .onClick(async () => {
                                await this.copyFileContents(file);
                            });
                    });
                    
                    menu.addItem((item) => {
                        item
                            .setTitle('Export contents to file')
                            .setIcon('file-export')
                            .onClick(async () => {
                                await this.exportFileContents(file);
                            });
                    });
                }
            })
        );

        // Register context menu for folders
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                if (file instanceof TFolder) {
                    menu.addItem((item) => {
                        item
                            .setTitle('Copy folder contents to clipboard')
                            .setIcon('copy')
                            .onClick(async () => {
                                await this.copyFolderContents(file);
                            });
                    });
                    
                    menu.addItem((item) => {
                        item
                            .setTitle('Export folder contents to file')
                            .setIcon('file-export')
                            .onClick(async () => {
                                await this.exportFolderContents(file);
                            });
                    });
                }
            })
        );

        // Add commands without default hotkeys
        this.addCommand({
            id: 'copy-active-file-contents',
            name: 'Copy active file contents to clipboard',
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    await this.copyFileContents(activeFile);
                } else {
                    new Notice('No active file');
                }
            }
        });

        this.addCommand({
            id: 'copy-current-folder-contents',
            name: 'Copy current folder contents to clipboard',
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    const folder = activeFile.parent;
                    if (folder) {
                        await this.copyFolderContents(folder);
                    } else {
                        new Notice('No parent folder found');
                    }
                } else {
                    new Notice('No active file');
                }
            }
        });

        this.addCommand({
            id: 'export-active-file-contents',
            name: 'Export active file contents to file',
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    await this.exportFileContents(activeFile);
                } else {
                    new Notice('No active file');
                }
            }
        });

        this.addCommand({
            id: 'export-current-folder-contents',
            name: 'Export current folder contents to file',
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    const folder = activeFile.parent;
                    if (folder) {
                        await this.exportFolderContents(folder);
                    } else {
                        new Notice('No parent folder found');
                    }
                } else {
                    new Notice('No active file');
                }
            }
        });

        // Add settings tab
        this.addSettingTab(new CopyContentsSettingTab(this.app, this));
    }

    async copyFileContents(file) {
        try {
            // Check file size
            if (file.stat.size > this.settings.maxFileSize * 1024) {
                new Notice(`File too large (>${this.settings.maxFileSize}KB). Skipping.`);
                return;
            }

            // Check file extension
            const extension = file.extension.toLowerCase();
            if (!this.settings.fileExtensions.includes(extension)) {
                new Notice(`File type .${extension} not supported`);
                return;
            }

            const content = await this.app.vault.read(file);
            const formattedOutput = this.formatContent([{
                name: file.name,
                path: file.path,
                content: content,
                size: file.stat.size
            }]);

            await navigator.clipboard.writeText(formattedOutput);
            
            const sizeKB = (file.stat.size / 1024).toFixed(1);
            new Notice(`Copied "${file.name}" (${sizeKB} KB) to clipboard`);

        } catch (error) {
            console.error('Error copying file contents:', error);
            new Notice('Failed to copy file contents');
        }
    }

    async copyFolderContents(folder) {
        try {
            const files = await this.getAllFilesInFolder(folder);
            const validFiles = files.filter(file => {
                const extension = file.extension.toLowerCase();
                return this.settings.fileExtensions.includes(extension) && 
                       file.stat.size <= this.settings.maxFileSize * 1024;
            });

            if (validFiles.length === 0) {
                new Notice('No valid files found in folder');
                return;
            }

            // Show selection modal for large folders
            if (this.settings.showSelectionModal && validFiles.length >= this.settings.selectionThreshold) {
                return new Promise((resolve) => {
                    new FileSelectionModal(this.app, validFiles, async (selectedFiles) => {
                        if (selectedFiles.length === 0) {
                            new Notice('No files selected');
                            resolve();
                            return;
                        }
                        await this.processSelectedFiles(selectedFiles, folder.name, 'clipboard');
                        resolve();
                    }).open();
                });
            }

            await this.processSelectedFiles(validFiles, folder.name, 'clipboard');

        } catch (error) {
            console.error('Error copying folder contents:', error);
            new Notice('Failed to copy folder contents');
        }
    }

    async exportFileContents(file) {
        try {
            // Check file size and extension (same as copy)
            if (file.stat.size > this.settings.maxFileSize * 1024) {
                new Notice(`File too large (>${this.settings.maxFileSize}KB). Skipping.`);
                return;
            }

            const extension = file.extension.toLowerCase();
            if (!this.settings.fileExtensions.includes(extension)) {
                new Notice(`File type .${extension} not supported`);
                return;
            }

            const content = await this.app.vault.read(file);
            const formattedOutput = this.formatContent([{
                name: file.name,
                path: file.path,
                content: content,
                size: file.stat.size
            }]);

            const exportPath = await this.createExportPath(file.name);
            await this.app.vault.create(exportPath, formattedOutput);
            
            const sizeKB = (file.stat.size / 1024).toFixed(1);
            new Notice(`Exported "${file.name}" (${sizeKB} KB) to ${exportPath}`);

        } catch (error) {
            console.error('Error exporting file contents:', error);
            new Notice('Failed to export file contents');
        }
    }

    async exportFolderContents(folder) {
        try {
            const files = await this.getAllFilesInFolder(folder);
            const validFiles = files.filter(file => {
                const extension = file.extension.toLowerCase();
                return this.settings.fileExtensions.includes(extension) && 
                       file.stat.size <= this.settings.maxFileSize * 1024;
            });

            if (validFiles.length === 0) {
                new Notice('No valid files found in folder');
                return;
            }

            // Show selection modal for large folders
            if (this.settings.showSelectionModal && validFiles.length >= this.settings.selectionThreshold) {
                return new Promise((resolve) => {
                    new FileSelectionModal(this.app, validFiles, async (selectedFiles) => {
                        if (selectedFiles.length === 0) {
                            new Notice('No files selected');
                            resolve();
                            return;
                        }
                        await this.processSelectedFiles(selectedFiles, folder.name, 'export');
                        resolve();
                    }).open();
                });
            }

            await this.processSelectedFiles(validFiles, folder.name, 'export');

        } catch (error) {
            console.error('Error exporting folder contents:', error);
            new Notice('Failed to export folder contents');
        }
    }

    async processSelectedFiles(files, folderName, outputType) {
        const fileContents = [];
        for (const file of files) {
            try {
                const content = await this.app.vault.read(file);
                const relativePath = file.path.includes('/') ? 
                    file.path.replace(file.path.split('/').slice(0, -1).join('/') + '/', '') : 
                    file.name;
                
                fileContents.push({
                    name: file.name,
                    path: relativePath,
                    content: content,
                    size: file.stat.size
                });
            } catch (error) {
                console.error(`Error reading file ${file.path}:`, error);
                fileContents.push({
                    name: file.name,
                    path: file.name,
                    content: '*Error reading file*',
                    size: 0
                });
            }
        }

        const formattedOutput = this.formatContent(fileContents, folderName);
        const totalSize = files.reduce((sum, f) => sum + f.stat.size, 0);
        const totalSizeKB = (totalSize / 1024).toFixed(1);

        if (outputType === 'clipboard') {
            await navigator.clipboard.writeText(formattedOutput);
            new Notice(`Copied ${files.length} files (${totalSizeKB} KB) from "${folderName}" to clipboard`);
        } else {
            const exportPath = await this.createExportPath(`${folderName}-contents`);
            await this.app.vault.create(exportPath, formattedOutput);
            new Notice(`Exported ${files.length} files (${totalSizeKB} KB) from "${folderName}" to ${exportPath}`);
        }
    }

    async createExportPath(baseName) {
        // Ensure export folder exists
        const exportFolder = this.settings.exportLocation;
        if (!await this.app.vault.adapter.exists(exportFolder)) {
            await this.app.vault.createFolder(exportFolder);
        }

        // Create filename with timestamp if enabled
        let fileName = baseName;
        if (this.settings.includeTimestamp) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            fileName = `${baseName}-${timestamp}`;
        }

        // Add appropriate extension
        const extension = this.settings.outputFormat === 'json' ? 'json' : 
                         this.settings.outputFormat === 'plaintext' ? 'txt' : 'md';
        
        let fullPath = `${exportFolder}/${fileName}.${extension}`;
        
        // Handle filename conflicts
        let counter = 1;
        while (await this.app.vault.adapter.exists(fullPath)) {
            const conflictName = this.settings.includeTimestamp ? 
                `${baseName}-${timestamp}-${counter}` : 
                `${baseName}-${counter}`;
            fullPath = `${exportFolder}/${conflictName}.${extension}`;
            counter++;
        }

        return fullPath;
    }

    formatContent(fileContents, folderName) {
        switch (this.settings.outputFormat) {
            case 'json':
                return this.formatAsJSON(fileContents, folderName);
            case 'plaintext':
                return this.formatAsPlainText(fileContents, folderName);
            case 'markdown':
            default:
                return this.formatAsMarkdown(fileContents, folderName);
        }
    }

    formatAsMarkdown(fileContents, folderName) {
        let output = '';
        
        if (folderName && this.settings.includeFolderStructure) {
            output += `# Folder: ${folderName}\n\n`;
        }

        fileContents.forEach((file, index) => {
            if (this.settings.includeFileNames) {
                const headerLevel = folderName ? '##' : '#';
                output += `${headerLevel} ${file.path}\n\n`;
            }
            
            output += file.content;
            
            if (index < fileContents.length - 1) {
                output += `\n\n${this.settings.customSeparator}\n\n`;
            }
        });

        return output;
    }

    formatAsPlainText(fileContents, folderName) {
        let output = '';
        
        if (folderName && this.settings.includeFolderStructure) {
            output += `FOLDER: ${folderName.toUpperCase()}\n\n`;
        }

        fileContents.forEach((file, index) => {
            if (this.settings.includeFileNames) {
                output += `FILE: ${file.path}\n\n`;
            }
            
            // Strip markdown formatting for plain text
            const plainContent = file.content
                .replace(/#{1,6}\s+/g, '') // Remove headers
                .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
                .replace(/\*(.*?)\*/g, '$1') // Remove italic
                .replace(/`(.*?)`/g, '$1') // Remove inline code
                .replace(/```[\s\S]*?```/g, '[CODE BLOCK]') // Replace code blocks
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Convert links to text
            
            output += plainContent;
            
            if (index < fileContents.length - 1) {
                output += `\n\n${this.settings.customSeparator}\n\n`;
            }
        });

        return output;
    }

    formatAsJSON(fileContents, folderName) {
        const data = {
            folder: folderName || null,
            timestamp: new Date().toISOString(),
            fileCount: fileContents.length,
            totalSize: fileContents.reduce((sum, f) => sum + f.size, 0),
            files: fileContents.map(file => ({
                name: file.name,
                path: file.path,
                size: file.size,
                content: file.content
            }))
        };

        return JSON.stringify(data, null, 2);
    }

    async getAllFilesInFolder(folder) {
        const files = [];
        
        for (const child of folder.children) {
            if (child instanceof TFile) {
                files.push(child);
            } else if (child instanceof TFolder) {
                const subFiles = await this.getAllFilesInFolder(child);
                files.push(...subFiles);
            }
        }
        
        return files;
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class FileSelectionModal extends Modal {
    constructor(app, files, onSubmit) {
        super(app);
        this.selectedFiles = new Set();
        this.files = files;
        this.onSubmit = onSubmit;
        
        // Pre-select all files
        this.files.forEach(file => this.selectedFiles.add(file));
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Select files to copy' });
        contentEl.createEl('p', { 
            text: `Found ${this.files.length} files. Select which ones to include:`,
            cls: 'setting-item-description'
        });

        // Select all/none buttons
        const buttonContainer = contentEl.createDiv({ cls: 'copy-contents-button-container' });

        const selectAllBtn = new ButtonComponent(buttonContainer)
            .setButtonText('Select all')
            .onClick(() => {
                this.files.forEach(file => this.selectedFiles.add(file));
                this.updateCheckboxes();
            });

        const selectNoneBtn = new ButtonComponent(buttonContainer)
            .setButtonText('Select none')
            .onClick(() => {
                this.selectedFiles.clear();
                this.updateCheckboxes();
            });

        // File list container
        const fileListContainer = contentEl.createDiv({ cls: 'copy-contents-file-list' });

        // Create checkboxes for each file
        this.files.forEach(file => {
            const fileItem = fileListContainer.createDiv({ cls: 'copy-contents-file-item' });

            const checkbox = fileItem.createEl('input', { type: 'checkbox', cls: 'copy-contents-checkbox' });
            checkbox.checked = this.selectedFiles.has(file);
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    this.selectedFiles.add(file);
                } else {
                    this.selectedFiles.delete(file);
                }
            });

            const fileInfo = fileItem.createDiv({ cls: 'copy-contents-file-info' });
            
            const fileName = fileInfo.createEl('div', { text: file.name, cls: 'copy-contents-file-name' });

            const fileDetails = fileInfo.createEl('div', { 
                text: `${file.path} • ${(file.stat.size / 1024).toFixed(1)} KB`,
                cls: 'copy-contents-file-details'
            });
        });

        // Action buttons
        const actionContainer = contentEl.createDiv({ cls: 'copy-contents-actions' });

        new ButtonComponent(actionContainer)
            .setButtonText('Cancel')
            .onClick(() => this.close());

        new ButtonComponent(actionContainer)
            .setButtonText('Copy selected')
            .setCta()
            .onClick(() => {
                this.onSubmit(Array.from(this.selectedFiles));
                this.close();
            });
    }

    updateCheckboxes() {
        const checkboxes = this.contentEl.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((checkbox, index) => {
            checkbox.checked = this.selectedFiles.has(this.files[index]);
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class CopyContentsSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        // Output format
        new Setting(containerEl)
            .setName('Output format')
            .setDesc('Choose how content is formatted when copied')
            .addDropdown(dropdown => dropdown
                .addOption('markdown', 'Markdown')
                .addOption('plaintext', 'Plain Text')
                .addOption('json', 'JSON')
                .setValue(this.plugin.settings.outputFormat)
                .onChange(async (value) => {
                    this.plugin.settings.outputFormat = value;
                    await this.plugin.saveSettings();
                }));

        // Content section
        new Setting(containerEl).setName('Content').setHeading();

        new Setting(containerEl)
            .setName('Include file names')
            .setDesc('Add file names as headers when copying')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.includeFileNames)
                .onChange(async (value) => {
                    this.plugin.settings.includeFileNames = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Include folder structure')
            .setDesc('Add folder name as main header when copying folders')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.includeFolderStructure)
                .onChange(async (value) => {
                    this.plugin.settings.includeFolderStructure = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Custom separator')
            .setDesc('Text used to separate files (markdown/plaintext formats only)')
            .addText(text => text
                .setPlaceholder('---')
                .setValue(this.plugin.settings.customSeparator)
                .onChange(async (value) => {
                    this.plugin.settings.customSeparator = value || '---';
                    await this.plugin.saveSettings();
                }));

        // File filtering section
        new Setting(containerEl).setName('File filtering').setHeading();

        new Setting(containerEl)
            .setName('Maximum file size (KB)')
            .setDesc('Skip files larger than this size')
            .addText(text => text
                .setPlaceholder('1000')
                .setValue(this.plugin.settings.maxFileSize.toString())
                .onChange(async (value) => {
                    const size = parseInt(value);
                    if (!isNaN(size) && size > 0) {
                        this.plugin.settings.maxFileSize = size;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('Supported file extensions')
            .setDesc('Comma-separated list of file extensions to copy')
            .addText(text => text
                .setPlaceholder('md,txt,json,csv')
                .setValue(this.plugin.settings.fileExtensions.join(','))
                .onChange(async (value) => {
                    const extensions = value.split(',').map(ext => ext.trim().toLowerCase());
                    this.plugin.settings.fileExtensions = extensions;
                    await this.plugin.saveSettings();
                }));

        // File selection section
        new Setting(containerEl).setName('File selection').setHeading();

        new Setting(containerEl)
            .setName('Show file selection modal')
            .setDesc('Show a modal to select files when copying large folders')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showSelectionModal)
                .onChange(async (value) => {
                    this.plugin.settings.showSelectionModal = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Selection threshold')
            .setDesc('Number of files that triggers the selection modal')
            .addText(text => text
                .setPlaceholder('10')
                .setValue(this.plugin.settings.selectionThreshold.toString())
                .onChange(async (value) => {
                    const threshold = parseInt(value);
                    if (!isNaN(threshold) && threshold > 0) {
                        this.plugin.settings.selectionThreshold = threshold;
                        await this.plugin.saveSettings();
                    }
                }));

        // Export section
        new Setting(containerEl).setName('Export').setHeading();

        new Setting(containerEl)
            .setName('Export folder')
            .setDesc('Folder where exported files will be saved')
            .addText(text => text
                .setPlaceholder('Exports')
                .setValue(this.plugin.settings.exportLocation)
                .onChange(async (value) => {
                    this.plugin.settings.exportLocation = value || 'Exports';
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Include timestamp in filename')
            .setDesc('Add timestamp to exported filenames to avoid conflicts')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.includeTimestamp)
                .onChange(async (value) => {
                    this.plugin.settings.includeTimestamp = value;
                    await this.plugin.saveSettings();
                }));
    }
}

module.exports = CopyContentsPlugin;
