# NextGen .md Previewer

A WYSIWYG markdown editor for VS Code. Edit rendered markdown directly without switching to raw mode.

## Features

- **True WYSIWYG editing**: Click directly on rendered markdown and start typing
- **Auto-save**: Changes sync automatically to your markdown file
- **Non-intrusive**: Opens via context menu, doesn't replace default editor
- **Extended markdown support** (coming soon):
  - Tables (GFM)
  - Task lists
  - Math equations (KaTeX)
  - Mermaid diagrams
  - Syntax-highlighted code blocks

## Usage

1. Open any `.md` file in VS Code
2. Right-click on the **file tab** (editor title bar)
3. Select **"Preview with NextGen .md Previewer"**
4. Edit directly in the WYSIWYG preview

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `nextgenMdPreviewer.autoSaveDelay` | `1000` | Delay (ms) before auto-saving changes |
| `nextgenMdPreviewer.toolbar.visible` | `true` | Show formatting toolbar |
| `nextgenMdPreviewer.toolbar.position` | `"floating"` | Toolbar position: `"top"` or `"floating"` |
| `nextgenMdPreviewer.features.math` | `true` | Enable LaTeX math rendering |
| `nextgenMdPreviewer.features.mermaid` | `true` | Enable Mermaid diagram rendering |
| `nextgenMdPreviewer.images.folder` | `"assets"` | Folder for uploaded images |

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

## License

MIT
