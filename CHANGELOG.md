# Changelog

All notable changes to the NextGen .md Previewer extension will be documented in this file.

## [0.3.0] - 2026-02-19

### Added
- **Formatting Toolbar**: Fixed toolbar with bold, italic, strikethrough, inline code, code block, link, heading dropdown, blockquote, undo/redo buttons
- **Keyboard Shortcuts**: Ctrl+B (bold), Ctrl+I (italic), Ctrl+K (link), Ctrl+Shift+S (strikethrough), Ctrl+Shift+C (code block)
- **Syntax Highlighting**: Prism.js integration with 20+ programming languages
- **Math Equations**: KaTeX support for inline ($...$) and block ($$...$$) LaTeX math
- **Image Display**: Local images now render correctly in preview
- **Active State Highlighting**: Toolbar buttons show active formatting state

### Fixed
- Auto-open no longer triggers for session-restored documents
- Preview doesn't auto-reopen after manual close
- Toolbar buttons properly reflect current formatting

## [0.2.0] - 2026-02-18

### Added
- Side-by-side preview option (`nextgenMdPreviewer.previewLocation`)
- Auto-open setting (`nextgenMdPreviewer.autoOpen`)
- Configurable auto-save delay

### Fixed
- Two-way sync between editor and preview
- Conflict detection for external file changes

## [0.1.0] - 2026-02-17

### Added
- Initial release
- WYSIWYG markdown editing with Milkdown
- GFM support (tables, task lists, strikethrough)
- Auto-save functionality
- VS Code theme integration
