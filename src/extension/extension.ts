import * as vscode from 'vscode';
import { EditorManager } from './editorManager';

let editorManager: EditorManager;

// Track documents that already have preview opened to avoid duplicates
const openedPreviews = new Set<string>();

export function activate(context: vscode.ExtensionContext) {
  editorManager = new EditorManager(context);

  // Record initially open editors to avoid auto-opening on reload
  vscode.window.visibleTextEditors.forEach((editor) => {
    openedPreviews.add(editor.document.uri.toString());
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

    // Skip if preview already opened for this document
    if (openedPreviews.has(uri)) {
      return;
    }

    // Check if it's a markdown file
    const lowerPath = document.uri.fsPath.toLowerCase();
    if (!lowerPath.endsWith('.md') && !lowerPath.endsWith('.markdown')) {
      return;
    }

    // Mark as opened to prevent duplicate previews
    openedPreviews.add(uri);

    // Small delay to allow the editor to fully render
    setTimeout(async () => {
      await editorManager.openPreview(document.uri);
    }, 150);
  });

  context.subscriptions.push(openPreviewCommand, autoOpenListener);
}

export function deactivate() {
  editorManager?.dispose();
}
