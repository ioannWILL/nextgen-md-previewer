import * as vscode from 'vscode';
import { EditorManager } from './editorManager';

let editorManager: EditorManager;

// Track documents that were already open when extension activated
const initiallyOpenDocs = new Set<string>();

export function activate(context: vscode.ExtensionContext) {
  editorManager = new EditorManager(context);

  // Record initially open documents to avoid auto-opening on reload
  vscode.workspace.textDocuments.forEach((doc) => {
    initiallyOpenDocs.add(doc.uri.toString());
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

  // Auto-open preview when markdown files are opened
  const autoOpenListener = vscode.workspace.onDidOpenTextDocument(async (document) => {
    const config = vscode.workspace.getConfiguration('nextgenMdPreviewer');
    if (!config.get<boolean>('autoOpen', false)) {
      return;
    }

    // Skip if document was already open when extension activated
    if (initiallyOpenDocs.has(document.uri.toString())) {
      return;
    }

    // Check if it's a markdown file
    if (document.languageId !== 'markdown') {
      return;
    }

    // Small delay to allow the editor to fully open first
    setTimeout(async () => {
      await editorManager.openPreview(document.uri);
    }, 100);
  });

  context.subscriptions.push(openPreviewCommand, autoOpenListener);
}

export function deactivate() {
  editorManager?.dispose();
}
