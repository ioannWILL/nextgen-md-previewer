import * as vscode from 'vscode';
import { EditorManager } from './editorManager';

let editorManager: EditorManager;

export function activate(context: vscode.ExtensionContext) {
  console.log('NextGen .md Previewer is now active');

  editorManager = new EditorManager(context);

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

      // Verify it's a markdown file
      if (!targetUri.fsPath.endsWith('.md') && !targetUri.fsPath.endsWith('.markdown')) {
        vscode.window.showErrorMessage('Selected file is not a markdown file');
        return;
      }

      await editorManager.openPreview(targetUri);
    }
  );

  context.subscriptions.push(openPreviewCommand);
}

export function deactivate() {
  editorManager?.dispose();
}
