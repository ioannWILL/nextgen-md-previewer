# NextGen .md Previewer

A WYSIWYG markdown editor for VS Code. Edit rendered markdown directly without switching to raw mode.

[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.85.0-blue)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **True WYSIWYG editing**: Click directly on rendered markdown and start typing
- **Auto-save**: Changes sync automatically to your markdown file
- **Non-intrusive**: Opens via context menu, doesn't replace default editor
- **GFM support**: Tables, task lists, strikethrough (GitHub Flavored Markdown)
- **Theme integration**: Matches your VS Code color theme

### Coming Soon
- Math equations (KaTeX)
- Mermaid diagrams
- Syntax-highlighted code blocks
- Floating formatting toolbar
- Image drag-and-drop

## Usage

1. Open any `.md` file in VS Code
2. Right-click on the **file tab** (editor title bar)
3. Select **"Preview with NextGen .md Previewer"**
4. Edit directly in the WYSIWYG preview

## Requirements

- VS Code 1.85.0 or higher

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `nextgenMdPreviewer.autoSaveDelay` | `1000` | Delay (ms) before auto-saving changes |
| `nextgenMdPreviewer.previewLocation` | `"sameTab"` | Where to open preview: `"sameTab"` or `"sideBySide"` |
| `nextgenMdPreviewer.autoOpen` | `false` | Automatically open preview when a markdown file is opened |
| `nextgenMdPreviewer.toolbar.visible` | `true` | Show formatting toolbar *(coming soon)* |
| `nextgenMdPreviewer.toolbar.position` | `"floating"` | Toolbar position: `"top"` or `"floating"` *(coming soon)* |
| `nextgenMdPreviewer.features.math` | `true` | Enable LaTeX math rendering *(coming soon)* |
| `nextgenMdPreviewer.features.mermaid` | `true` | Enable Mermaid diagram rendering *(coming soon)* |
| `nextgenMdPreviewer.images.folder` | `"assets"` | Folder for uploaded images *(coming soon)* |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run watch

# Run tests
npm test
```

## Known Limitations

- Math equations and Mermaid diagrams are not yet supported (Milkdown v7 deprecated plugins)
- Code blocks display without syntax highlighting
- Floating toolbar not yet implemented

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
