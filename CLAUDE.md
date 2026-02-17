# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm run build        # Build extension and webview bundles
npm run watch        # Watch mode with auto-rebuild
npm run lint         # Run ESLint
npm test             # Run tests with Vitest
```

## Testing the Extension

1. Open the project in VS Code
2. Run → Start Debugging (or use Command Palette: "Debug: Start Debugging")
3. In the Extension Development Host window, open any `.md` file
4. Right-click on the file tab → "NextGen Preview"

## Architecture

This is a VS Code extension that provides WYSIWYG markdown editing using Milkdown.

### Dual Bundle System

The extension produces two separate bundles via esbuild (`esbuild.config.mjs`):

1. **Extension Host** (`dist/extension.js`) - Node.js, runs in VS Code's extension host
2. **Webview** (`dist/webview/index.js`) - Browser, runs inside the WebviewPanel

### Core Components

**Extension Side** (`src/extension/`):
- `extension.ts` - Entry point, registers `nextgenMdPreviewer.open` command
- `editorManager.ts` - Creates/manages WebviewPanels, generates HTML with inline CSS, handles panel lifecycle
- `syncController.ts` - Two-way sync between TextDocument and webview with debounced auto-save

**Webview Side** (`src/webview/`):
- `index.ts` - Initializes Milkdown editor with commonmark + GFM presets, handles message passing

### Communication Flow

```
TextDocument ←→ SyncController ←→ postMessage ←→ Webview (Milkdown)
```

- Webview sends `contentChanged` messages when user edits
- Extension sends `contentUpdate` messages for external changes
- SyncController debounces writes to avoid thrashing (configurable via `nextgenMdPreviewer.autoSaveDelay`)

### Extension Activation

Activated via `editor/title/context` menu on markdown files. The command `nextgenMdPreviewer.open` creates a WebviewPanel in the active editor column.

## Key Dependencies

- **Milkdown** (`@milkdown/core`, `preset-commonmark`, `preset-gfm`) - WYSIWYG markdown editor
- **esbuild** - Bundler for both extension and webview code

## Planned Features (Not Yet Implemented)

- Math equations (KaTeX) - `@milkdown/plugin-math` is deprecated, needs alternative
- Mermaid diagrams - `@milkdown/plugin-diagram` is deprecated, needs alternative
- Syntax highlighting for code blocks (Prism.js)
- Floating toolbar
