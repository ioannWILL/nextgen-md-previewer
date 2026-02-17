import * as vscode from 'vscode';

interface WebviewMessage {
  type: string;
  content?: string;
}

export class SyncController implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private saveTimeout: NodeJS.Timeout | null = null;
  private pendingContent: string | null = null;
  private isUpdatingFromExtension = false;
  private readonly debounceMs: number;

  constructor(
    private document: vscode.TextDocument,
    private panel: vscode.WebviewPanel,
    private context: vscode.ExtensionContext
  ) {
    const config = vscode.workspace.getConfiguration('nextgenMdPreviewer');
    this.debounceMs = config.get('autoSaveDelay', 1000);

    this.setupMessageHandling();
    this.setupDocumentWatcher();
  }

  private setupMessageHandling(): void {
    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
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
      if (event.document.uri.toString() === this.document.uri.toString()) {
        if (!this.isUpdatingFromExtension) {
          // External change (e.g., from source editor or undo)
          this.sendContentToWebview();
        }
      }
    });

    this.disposables.push(changeDisposable);
  }

  private sendContentToWebview(): void {
    this.panel.webview.postMessage({
      type: 'contentUpdate',
      content: this.document.getText(),
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
    if (this.pendingContent === null) return;

    const currentContent = this.document.getText();
    if (currentContent === this.pendingContent) {
      this.pendingContent = null;
      return;
    }

    this.isUpdatingFromExtension = true;

    try {
      const edit = new vscode.WorkspaceEdit();
      const fullRange = new vscode.Range(
        this.document.positionAt(0),
        this.document.positionAt(currentContent.length)
      );
      edit.replace(this.document.uri, fullRange, this.pendingContent);
      await vscode.workspace.applyEdit(edit);
    } finally {
      this.isUpdatingFromExtension = false;
      this.pendingContent = null;
    }
  }

  dispose(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.disposables.forEach((d) => d.dispose());
  }
}
