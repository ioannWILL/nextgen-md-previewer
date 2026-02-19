# CTO-PROJECT

> This file serves as the source of truth for AI assistants working on this project. Keep it updated as the project evolves.

**Repository:** https://github.com/IvanVilchavskyi/nextgen-md-previewer

## Product Vision

**What are we building and why?**

NextGen .md Previewer is a VS Code extension that enables seamless WYSIWYG editing of markdown files directly in VS Code. Users can edit rendered markdown inline without switching between raw source and preview modes, making documentation writing feel as natural as using a rich text editor.

---

## User Personas

**Who is this for?**

### Persona 1: Developer
- **Background:** Software developer writing code documentation, READMEs, and technical notes
- **Goals:** Quickly edit markdown without context-switching; focus on content, not syntax
- **Pain Points:** Constant toggling between source and preview; remembering markdown syntax for tables

### Persona 2: Technical Writer
- **Background:** Documentation specialist producing API docs, guides, and knowledge base articles
- **Goals:** Efficient visual editing with full markdown feature support (tables, diagrams, math)
- **Pain Points:** Need to learn markdown syntax; lack of visual feedback during editing

### Persona 3: Knowledge Worker
- **Background:** Anyone who works with markdown files for notes, wikis, or blogs
- **Goals:** Edit markdown files intuitively without learning raw syntax
- **Pain Points:** Markdown formatting feels like a barrier to quick note-taking

---

## Core Features

**High-level list of what the app does:**

1. **True WYSIWYG editing** - Click directly on rendered markdown and start typing
2. **Non-intrusive integration** - Opens via context menu, doesn't replace VS Code's default markdown editor
3. **Auto-save** - Changes sync automatically to the source markdown file with configurable delay
4. **GFM support** - Tables, task lists, strikethrough (GitHub Flavored Markdown)
5. **Extended markdown** - Math equations (KaTeX), syntax-highlighted code blocks (Prism.js, 20+ languages)
6. **Fixed toolbar** - Format text with toolbar at top of editor (bold, italic, strikethrough, code, links, headings, blockquotes)
7. **VS Code theme integration** - Editor matches the active VS Code theme (basic CSS variables)
8. **Image handling** *(planned)* - Drag-and-drop image upload to configurable assets folder

---

## Tech Stack

### Frontend (Webview)
- **Framework:** Milkdown (ProseMirror-based WYSIWYG editor)
- **Language:** TypeScript
- **Styling:** Inline CSS (injected into WebviewPanel)

### Backend (Extension Host)
- **Runtime:** Node.js (VS Code Extension Host)
- **Language:** TypeScript
- **API:** VS Code Extension API

### Build System
- **Bundler:** esbuild
- **Dual builds:** Extension (Node.js CJS) + Webview (Browser IIFE)
- **Tooling:** ESLint, Vitest

### Key Libraries
| Library | Purpose | Status |
|---------|---------|--------|
| `@milkdown/core` | WYSIWYG markdown editor core | In use |
| `@milkdown/ctx` | Milkdown context/dependency injection | In use |
| `@milkdown/preset-commonmark` | Standard markdown syntax | In use |
| `@milkdown/preset-gfm` | GitHub Flavored Markdown | In use |
| `@milkdown/plugin-listener` | Content change event handling | In use |
| `@milkdown/plugin-history` | Undo/redo support | In use |
| `@milkdown/plugin-prism` | Syntax highlighting integration | In use |
| `@milkdown/plugin-math` | Math equations | In use |
| `katex` | LaTeX math rendering | In use |
| `prismjs` | Code syntax highlighting | In use |
| `mermaid` | Diagram rendering | Removed (DOM conflicts) |

### Infrastructure
- **VS Code Engine:** `^1.85.0` (minimum supported version)
- **Distribution:** VS Code Marketplace + Open VSX (Cursor)
- **CI/CD:** Manual publishing via `vsce publish` and `ovsx publish`

---

## Architecture

**How the systems talk to each other:**

```
┌─────────────────────────────────────────────────────────┐
│                   VS Code Extension Host                │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Command Handler                     │   │
│  │  "nextgenMdPreviewer.open" (context menu)       │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         ↓                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │              EditorManager                       │   │
│  │  TextDocument ←→ SyncController ←→ WebviewPanel │   │
│  └─────────────────────────────────────────────────┘   │
│                         ↕ postMessage                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │                 WebviewPanel                     │   │
│  │  ┌───────────────────────────────────────────┐  │   │
│  │  │            Milkdown Editor                 │  │   │
│  │  │  Remark (MD AST) ←→ ProseMirror ←→ DOM    │  │   │
│  │  └───────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Communication Flow
```
TextDocument ←→ SyncController ←→ postMessage ←→ Webview (Milkdown)
```

- Webview sends `contentChanged` messages when user edits
- Extension sends `contentUpdate` messages for external file changes
- SyncController debounces writes to avoid disk thrashing

### Project Structure
```
nextgen-md-previewer/
├── .vscode/
│   ├── launch.json             # Debug configurations (F5 to test)
│   └── tasks.json              # Build tasks
├── src/
│   ├── extension/              # Node.js (extension host)
│   │   ├── extension.ts        # Entry point, register commands
│   │   ├── editorManager.ts    # Creates/manages WebviewPanels
│   │   └── syncController.ts   # Document ↔ Webview sync
│   ├── webview/                # Browser (webview)
│   │   ├── index.ts            # Milkdown setup, message handling
│   │   └── toolbar.ts          # Formatting toolbar component
│   └── shared/                 # Shared types
│       └── types.ts
├── dist/                       # Build output (git-ignored)
│   ├── extension.js            # Extension bundle
│   └── webview/
│       └── index.js            # Webview bundle
├── package.json                # Extension manifest
├── esbuild.config.mjs          # Dual build configuration
└── tsconfig.json
```

### Key Design Decisions

1. **Milkdown over alternatives** - Markdown-first editor that preserves formatting, official plugin ecosystem, ~40kb bundle
2. **esbuild over webpack** - 50x faster builds, native TypeScript support
3. **Context menu activation** - Non-intrusive; doesn't hijack default markdown editing
4. **Dual bundle architecture** - Separate Node.js and browser bundles for clean separation

---

## Rules

**Coding standards, naming conventions, and best practices:**

### Code Style
- Follow VS Code extension development best practices
- Use ESLint with TypeScript rules
- Strict TypeScript (`strict: true`)
- ES2020 target for modern syntax

### Naming Conventions
- **Files:** camelCase (e.g., `editorManager.ts`, `syncController.ts`)
- **Classes:** PascalCase (e.g., `EditorManager`, `SyncController`)
- **Functions/Methods:** camelCase (e.g., `createPanel`, `handleMessage`)
- **Constants:** SCREAMING_SNAKE_CASE for true constants
- **Interfaces:** PascalCase, no `I` prefix

### Extension Patterns
- Commands prefixed with `nextgenMdPreviewer.`
- Configuration under `nextgenMdPreviewer.*` namespace
- Dispose resources properly using `Disposable` pattern
- Use VS Code's `workspace.getConfiguration()` for settings

### Git Workflow
- Main branch: `main`
- Feature branches: `feature/<description>`
- Commit messages: Conventional Commits format recommended

### Publishing Workflow
- **Publishing is manual** - Only publish when the user explicitly requests it
- Commits to `main` do NOT trigger automatic publishing
- To publish: user must explicitly say "publish" or "release"
- Publish to both VS Code Marketplace and Open VSX (Cursor)

### Testing
- Test framework: Vitest
- Run tests: `npm test`
- Focus on SyncController (debouncing, conflict handling) and command registration

---

## Quick Commands

```bash
# Development
npm run watch        # Watch mode with auto-rebuild

# Build
npm run build        # Build extension and webview bundles

# Testing
npm test             # Run tests with Vitest
npm run lint         # Run ESLint

# Debug Extension
# 1. Open project in VS Code
# 2. Run → Start Debugging (F5)
# 3. In Extension Development Host, open any .md file
# 4. Right-click file tab → "Preview with NextGen .md Previewer"

# Package for Distribution
npm run vscode:prepublish    # Production build
# Then use `vsce package` to create .vsix
```

---

## Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| `nextgenMdPreviewer.autoSaveDelay` | `1000` | Delay (ms) before auto-saving changes |
| `nextgenMdPreviewer.previewLocation` | `"sameTab"` | Where to open preview: `"sameTab"` or `"sideBySide"` |
| `nextgenMdPreviewer.autoOpen` | `false` | Automatically open preview when a markdown file is opened |
| `nextgenMdPreviewer.toolbar.visible` | `true` | Show formatting toolbar |
| `nextgenMdPreviewer.features.math` | `true` | Enable LaTeX math rendering |
| `nextgenMdPreviewer.features.mermaid` | `true` | Enable Mermaid diagram rendering |
| `nextgenMdPreviewer.images.folder` | `"assets"` | Folder for uploaded images |

---

## Implementation Status

### Completed
- [x] Project setup with TypeScript and esbuild
- [x] Extension manifest with context menu contribution
- [x] EditorManager for WebviewPanel creation
- [x] SyncController with debounced auto-save and disposal guards
- [x] Milkdown editor with CommonMark + GFM + History + Prism + Math
- [x] Fixed toolbar with formatting buttons and keyboard shortcuts
- [x] Math equations (KaTeX) - inline and block
- [x] Prism.js code highlighting (20+ languages)
- [x] VS Code theme synchronization via CSS variables
- [x] Unit tests for SyncController (95% coverage)
- [x] Image path resolution for local images
- [x] Published to VS Code Marketplace and Open VSX

### Not Implemented / Deferred
- [ ] Mermaid diagrams - removed due to DOM conflicts (needs custom Milkdown plugin)
- [ ] Floating toolbar (current toolbar is fixed at top)
- [ ] Image drag-and-drop handler
- [ ] Footnotes support (no Milkdown plugin available)
- [ ] Demo GIF and screenshots for marketplace

---

## Known Issues

| Issue | Impact | Workaround / Plan |
|-------|--------|-------------------|
| Mermaid diagrams not supported | Diagrams show as code blocks | Needs custom Milkdown plugin; deferred |
| Toolbar event listeners not cleaned up on destroy | Memory leak with many open/close cycles | Store bound handlers and remove in destroy() |
| Large document performance (>100KB) | Typing lag on very large files | Full document replacement; consider diff-based sync |
| Link dialog stale selection | Link may target wrong range if doc changes while dialog open | Re-capture selection on submit |
| KaTeX fonts may use fallbacks | Math may not render with optimal fonts | CSP limitation in webviews |

---

## Notes

- Extension activates on `onLanguage:markdown` for immediate availability when any markdown file is opened
- WebviewPanel uses `webview.asWebviewUri()` for secure local resource loading
- Inline styles use VS Code CSS variables (`--vscode-*`) for theme integration
- Published to both VS Code Marketplace and Open VSX (Cursor)
- `deactivate()` is async to ensure pending edits are flushed on shutdown
- SyncController has disposal guards to prevent double-flush bugs
