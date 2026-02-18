import * as vscode from 'vscode';
import { EditorManager } from './editorManager';

let editorManager: EditorManager;

// Track documents that were open on activation (skip auto-open for these once)
const initialDocuments = new Set<string>();

// Track documents whose preview was manually closed (don't auto-reopen until user switches away)
const manuallyClosed = new Set<string>();

// Track the last active document to know when user switches away
let lastActiveDocument: string | undefined;

export function activate(context: vscode.ExtensionContext) {
  editorManager = new EditorManager(context);

  // Record initially open editors to avoid auto-opening on reload
  vscode.window.visibleTextEditors.forEach((editor) => {
    initialDocuments.add(editor.document.uri.toString());
  });

  // Listen for panel close events to track manually closed previews
  const panelCloseListener = editorManager.onPanelClosed((uri) => {
    // Mark as manually closed so we don't auto-reopen immediately
    manuallyClosed.add(uri);
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

      // Clear manually closed flag since user explicitly requested preview
      manuallyClosed.delete(targetUri.toString());

      await editorManager.openPreview(targetUri);
    }
  );

  // Auto-open preview when switching to a markdown file
  const autoOpenListener = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
    if (!editor) {
      return;
    }

    const document = editor.document;
    const uri = document.uri.toString();

    // When switching to a different document, clear the manually closed flag for the previous one
    if (lastActiveDocument && lastActiveDocument !== uri) {
      manuallyClosed.delete(lastActiveDocument);
    }
    lastActiveDocument = uri;

    const config = vscode.workspace.getConfiguration('nextgenMdPreviewer');
    if (!config.get<boolean>('autoOpen', false)) {
      return;
    }

    // Skip initially open documents (only once, then allow auto-open)
    if (initialDocuments.has(uri)) {
      initialDocuments.delete(uri);
      return;
    }

    // Skip if user manually closed the preview for this document
    if (manuallyClosed.has(uri)) {
      return;
    }

    // Check if it's a markdown file
    const lowerPath = document.uri.fsPath.toLowerCase();
    if (!lowerPath.endsWith('.md') && !lowerPath.endsWith('.markdown')) {
      return;
    }

    // Small delay to allow the editor to fully render
    // EditorManager handles duplicate prevention (reveals existing panel)
    setTimeout(async () => {
      await editorManager.openPreview(document.uri);
    }, 150);
  });

  context.subscriptions.push(openPreviewCommand, autoOpenListener, panelCloseListener);
}

export function deactivate() {
  editorManager?.dispose();
}
