# NextGen .md Previewer

A WYSIWYG markdown editor for VS Code. Edit rendered markdown directly without switching to raw mode.

[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.85.0-blue)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **True WYSIWYG editing**: Click directly on rendered markdown and start typing
- **Auto-save**: Changes sync automatically to your markdown file
- **Formatting toolbar**: Bold, italic, strikethrough, code, links, headings, blockquotes
- **Keyboard shortcuts**: Standard formatting shortcuts (Ctrl+B, Ctrl+I, etc.)
- **Syntax highlighting**: Code blocks with Prism.js (20+ languages)
- **Math equations**: LaTeX math with KaTeX ($...$ and $$...$$)
- **GFM support**: Tables, task lists, strikethrough (GitHub Flavored Markdown)
- **Theme integration**: Matches your VS Code color theme
- **Undo/Redo**: Full history support

## Usage

1. Open any `.md` file in VS Code
2. Right-click on the **file tab** (editor title bar)
3. Select **"Preview with NextGen .md Previewer"**
4. Edit directly in the WYSIWYG preview

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` / `Cmd+B` | Bold |
| `Ctrl+I` / `Cmd+I` | Italic |
| `Ctrl+K` / `Cmd+K` | Insert/Remove Link |
| `Ctrl+Shift+S` / `Cmd+Shift+S` | Strikethrough |
| `Ctrl+Shift+C` / `Cmd+Shift+C` | Code Block |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `nextgenMdPreviewer.autoSaveDelay` | `1000` | Delay (ms) before auto-saving changes |
| `nextgenMdPreviewer.previewLocation` | `"sameTab"` | Where to open preview: `"sameTab"` or `"sideBySide"` |
| `nextgenMdPreviewer.autoOpen` | `false` | Automatically open preview when opening markdown files |
| `nextgenMdPreviewer.toolbar.visible` | `true` | Show formatting toolbar |

## Supported Languages (Syntax Highlighting)

JavaScript, TypeScript, JSX, TSX, Python, Java, C, C++, C#, Go, Rust, Ruby, PHP, Swift, Kotlin, SQL, Bash, YAML, JSON, CSS, Markdown, Docker, Diff

## Requirements

- VS Code 1.85.0 or higher

## Known Limitations

- Mermaid diagrams not yet supported (requires custom plugin development)
- KaTeX fonts may not render perfectly in all themes
- Image drag-and-drop not yet implemented

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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
