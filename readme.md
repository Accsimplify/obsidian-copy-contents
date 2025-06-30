# Copy Contents Plugin

**Quickly copy or export file and folder contents to clipboard or files - perfect for pasting into LLMs, Word docs, or sharing research.**

## Features

- **Right-click context menu** - Copy file or folder contents instantly
- **Multiple output formats** - Markdown, Plain Text, or JSON
- **File selection modal** - Choose specific files from large folders
- **Export to files** - Save contents as timestamped files in your vault
- **Hotkeys** - Fast keyboard shortcuts for common actions
- **Smart filtering** - Skip large files, select supported extensions

## Usage

### Context Menu
Right-click any note or folder to see:
- "Copy contents to clipboard" 
- "Export contents to file"

### Hotkeys
- `Cmd/Ctrl + Shift + C` - Copy active file contents
- `Cmd/Ctrl + Shift + F` - Copy current folder contents  
- `Cmd/Ctrl + Shift + E` - Export active file to file
- `Cmd/Ctrl + Alt + E` - Export current folder to file

### Large Folders
When copying folders with 10+ files, a selection modal appears letting you choose which files to include.

## Output Examples

### Markdown Format
```markdown
# Folder: Research Notes

## paper1.md

Content of first paper...

---

## paper2.md

Content of second paper...
```

### JSON Format
```json
{
  "folder": "Research Notes",
  "timestamp": "2025-06-30T10:30:00.000Z",
  "fileCount": 2,
  "totalSize": 5432,
  "files": [
    {
      "name": "paper1.md",
      "path": "paper1.md",
      "size": 2048,
      "content": "Content of first paper..."
    }
  ]
}
```

## Settings

Access via Settings → Community Plugins → Copy Contents:

- **Output format** - Choose Markdown, Plain Text, or JSON
- **File filtering** - Set size limits and supported extensions  
- **File selection** - Configure when selection modal appears
- **Export options** - Set export folder and filename format

## Common Use Cases

- **LLM research** - Copy multiple notes to paste into ChatGPT/Claude
- **Document creation** - Export formatted content for Word/Google Docs
- **Knowledge sharing** - Bundle related notes for colleagues
- **Backup/archiving** - Export timestamped snapshots of folder contents

## Installation

Install via Obsidian's Community Plugins:
1. Settings → Community Plugins → Browse
2. Search "Copy Contents"
3. Install and enable

## Support

- Report issues on [GitHub](https://github.com/Accsimplify/obsidian-copy-contents)
- Questions? Check [Discussions](https://github.com/Accsimplify/obsidian-copy-contents/discussions)

## License

MIT License - see LICENSE file for details.
