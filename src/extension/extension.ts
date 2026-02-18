import * as vscode from 'vscode';
import { EditorManager } from './editorManager';

let editorManager: EditorManager;

// Track documents that were open on activation (skip auto-open for these once)
const initialDocuments = new Set<string>();

export function activate(context: vscode.ExtensionContext) {
  editorManager = new EditorManager(context);

  // Record initially open editors to avoid auto-opening on reload
  vscode.window.visibleTextEditors.forEach((editor) => {
    initialDocuments.add(editor.document.uri.toString());
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

    // Skip initially open documents (only once, then allow auto-open)
    if (initialDocuments.has(uri)) {
      initialDocuments.delete(uri);
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

  context.subscriptions.push(openPreviewCommand, autoOpenListener);
}

export function deactivate() {
  editorManager?.dispose();
}
