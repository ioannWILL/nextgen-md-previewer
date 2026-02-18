import * as vscode from 'vscode';
import { WebviewToExtensionMessage } from '../shared/types';

export class SyncController implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private saveTimeout: NodeJS.Timeout | null = null;
  private pendingContent: string | null = null;
  private isApplying = false;
  private isUpdatingFromExtension = false;
  private needsResyncOnVisible = false;
  private readonly debounceMs: number;
  private readonly documentUri: vscode.Uri;

  constructor(
    initialDocument: vscode.TextDocument,
    private panel: vscode.WebviewPanel
  ) {
    this.documentUri = initialDocument.uri;
    const config = vscode.workspace.getConfiguration('nextgenMdPreviewer');
    this.debounceMs = config.get('autoSaveDelay', 1000);

    this.setupMessageHandling();
    this.setupDocumentWatcher();
    this.setupVisibilityHandler();
  }

  private getDocument(): vscode.TextDocument | undefined {
    return vscode.workspace.textDocuments.find(
      (d) => d.uri.toString() === this.documentUri.toString()
    );
  }

  private setupMessageHandling(): void {
    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      async (message: WebviewToExtensionMessage) => {
        switch (message.type) {
          case 'contentChanged':
            if (message.content !== undefined) {
              this.onContentChanged(message.content);
            }
            break;
          case 'ready':
            // Webview is ready, send initial content
            this.sendContentToWebview();
            break;
        }
      },
      null,
      this.disposables
    );
  }

  private setupDocumentWatcher(): void {
    // Watch for external changes to the document
    const changeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() === this.documentUri.toString()) {
        if (!this.isUpdatingFromExtension) {
          // External change (e.g., from source editor or undo)
          this.sendContentToWebview();
        }
      }
    });

    this.disposables.push(changeDisposable);
  }

  private setupVisibilityHandler(): void {
    // Resync when panel becomes visible again
    const visibilityDisposable = this.panel.onDidChangeViewState((e) => {
      if (e.webviewPanel.visible && this.needsResyncOnVisible) {
        this.needsResyncOnVisible = false;
        this.sendContentToWebview(true);
      }
    });

    this.disposables.push(visibilityDisposable);
  }

  private sendContentToWebview(force = false): void {
    // If panel is not visible, mark for resync on reveal
    if (!this.panel.visible && !force) {
      this.needsResyncOnVisible = true;
      return;
    }

    const document = this.getDocument();
    if (!document) return;

    this.panel.webview.postMessage({
      type: 'contentUpdate',
      content: document.getText(),
    });
  }

  private onContentChanged(newContent: string): void {
    this.pendingContent = newContent;

    // Debounce the save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.applyChanges();
    }, this.debounceMs);
  }

  private async applyChanges(): Promise<void> {
    // Prevent concurrent applies
    if (this.isApplying) return;
    if (this.pendingContent === null) return;

    // Capture the content to write and clear pending immediately
    // This allows new edits to queue up while we're writing
    const contentToWrite = this.pendingContent;
    this.pendingContent = null;
    this.isApplying = true;

    const document = this.getDocument();
    if (!document) {
      this.isApplying = false;
      return;
    }

    const currentContent = document.getText();
    if (currentContent === contentToWrite) {
      this.isApplying = false;
      return;
    }

    this.isUpdatingFromExtension = true;

    try {
      const edit = new vscode.WorkspaceEdit();
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(currentContent.length)
      );
      edit.replace(this.documentUri, fullRange, contentToWrite);
      const success = await vscode.workspace.applyEdit(edit);

      if (!success) {
        vscode.window.showErrorMessage('Failed to save changes to markdown file');
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Error saving changes: ${error}`);
    } finally {
      this.isUpdatingFromExtension = false;
      this.isApplying = false;

      // If new content arrived while we were writing, apply it
      if (this.pendingContent !== null) {
        this.applyChanges();
      }
    }
  }

  async dispose(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Flush any pending changes before disposal to prevent data loss
    if (this.pendingContent !== null) {
      await this.applyChanges();
    }

    this.disposables.forEach((d) => d.dispose());
  }
}
