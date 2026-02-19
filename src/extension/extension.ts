import * as vscode from 'vscode';
import { EditorManager } from './editorManager';

let editorManager: EditorManager;

// Track documents that were open on activation (never auto-open for these - session restore)
const sessionRestoredDocuments = new Set<string>();

// Track documents whose preview was manually closed in this session
const manuallyClosed = new Set<string>();

// Track when a panel was just closed to prevent immediate auto-reopen
let recentlyClosedTimestamp = 0;
const REOPEN_COOLDOWN_MS = 500;

export function activate(context: vscode.ExtensionContext) {
  editorManager = new EditorManager(context);

  // Record initially open editors - these are from session restore
  // Never auto-open previews for session-restored documents
  vscode.window.visibleTextEditors.forEach((editor) => {
    sessionRestoredDocuments.add(editor.document.uri.toString());
  });

  // Listen for panel close events to track manually closed previews
  const panelCloseListener = editorManager.onPanelClosed((uri) => {
    // Mark as manually closed so we don't auto-reopen
    manuallyClosed.add(uri);
    // Set cooldown to prevent immediate reopen from editor focus change
    recentlyClosedTimestamp = Date.now();
  });

  // Listen for document close to clear the manually closed flag
  const documentCloseListener = vscode.workspace.onDidCloseTextDocument((document) => {
    const uri = document.uri.toString();
    manuallyClosed.delete(uri);
    sessionRestoredDocuments.delete(uri);
  });

  // Register the command to open the WYSIWYG preview
  const openPreviewCommand = vscode.commands.registerCommand(
    'nextgenMdPreviewer.open',
    async (uri?: vscode.Uri) => {
      // Get the active editor's document URI if not provided
      const targetUri = uri ?? vscode.window.activeTextEditor?.document.uri;

      if (!targetUri) {
        vscode.window.showErrorMessage('No markdown file selected');
        return;
      }

      // Verify it's a markdown file (case-insensitive)
      const lowerPath = targetUri.fsPath.toLowerCase();
      if (!lowerPath.endsWith('.md') && !lowerPath.endsWith('.markdown')) {
        vscode.window.showErrorMessage('Selected file is not a markdown file');
        return;
      }

      // Clear flags since user explicitly requested preview
      manuallyClosed.delete(targetUri.toString());
      sessionRestoredDocuments.delete(targetUri.toString());

      await editorManager.openPreview(targetUri);
    }
  );

  // Auto-open preview when switching to a markdown file
  const autoOpenListener = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
    if (!editor) {
      return;
    }

    const config = vscode.workspace.getConfiguration('nextgenMdPreviewer');
    if (!config.get<boolean>('autoOpen', false)) {
      return;
    }

    const document = editor.document;
    const uri = document.uri.toString();

    // Skip session-restored documents (never auto-open these)
    if (sessionRestoredDocuments.has(uri)) {
      return;
    }

    // Skip if user manually closed the preview for this document
    if (manuallyClosed.has(uri)) {
      return;
    }

    // Skip if a panel was just closed (prevents immediate reopen)
    if (Date.now() - recentlyClosedTimestamp < REOPEN_COOLDOWN_MS) {
      return;
    }

    // Check if it's a markdown file
    const lowerPath = document.uri.fsPath.toLowerCase();
    if (!lowerPath.endsWith('.md') && !lowerPath.endsWith('.markdown')) {
      return;
    }

    // Skip if preview already exists for this document
    if (editorManager.hasPanel(document.uri)) {
      return;
    }

    // Small delay to allow the editor to fully render
    setTimeout(async () => {
      // Double-check conditions after delay
      if (manuallyClosed.has(uri) || sessionRestoredDocuments.has(uri)) {
        return;
      }
      if (Date.now() - recentlyClosedTimestamp < REOPEN_COOLDOWN_MS) {
        return;
      }
      await editorManager.openPreview(document.uri);
    }, 150);
  });

  context.subscriptions.push(
    openPreviewCommand,
    autoOpenListener,
    panelCloseListener,
    documentCloseListener
  );
}

export function deactivate() {
  editorManager?.dispose();
}
