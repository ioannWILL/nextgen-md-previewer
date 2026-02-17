import * as vscode from 'vscode';
import { SyncController } from './syncController';

export class EditorManager implements vscode.Disposable {
  private panels: Map<string, vscode.WebviewPanel> = new Map();
  private syncControllers: Map<string, SyncController> = new Map();
  private disposables: vscode.Disposable[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {}

  async openPreview(uri: vscode.Uri): Promise<void> {
    const key = uri.toString();

    // If panel already exists, reveal it
    const existingPanel = this.panels.get(key);
    if (existingPanel) {
      existingPanel.reveal();
      return;
    }

    // Open the document
    const document = await vscode.workspace.openTextDocument(uri);

    // Create webview panel
    const panel = vscode.window.createWebviewPanel(
      'nextgenMdPreviewer',
      `Preview: ${this.getFileName(uri)}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview'),
          vscode.Uri.joinPath(this.context.extensionUri, 'media'),
          vscode.Uri.file(this.getDocumentDirectory(uri)),
        ],
      }
    );

    // Store panel reference
    this.panels.set(key, panel);

    // Create sync controller
    const syncController = new SyncController(document, panel, this.context);
    this.syncControllers.set(key, syncController);

    // Set webview HTML content
    panel.webview.html = this.getWebviewContent(panel.webview, document.getText());

    // Handle panel disposal
    panel.onDidDispose(() => {
      this.panels.delete(key);
      this.syncControllers.get(key)?.dispose();
      this.syncControllers.delete(key);
    });
  }

  private getFileName(uri: vscode.Uri): string {
    const parts = uri.fsPath.split('/');
    return parts[parts.length - 1];
  }

  private getDocumentDirectory(uri: vscode.Uri): string {
    const parts = uri.fsPath.split('/');
    parts.pop();
    return parts.join('/');
  }

  private getWebviewContent(webview: vscode.Webview, initialContent: string): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'index.js')
    );

    const nonce = this.getNonce();

    // Escape content for embedding in HTML
    const escapedContent = this.escapeHtml(initialContent);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https: data:; font-src ${webview.cspSource};">
  <title>NextGen .md Previewer</title>
  <style>
    body {
      margin: 0;
      padding: 16px;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }
    #editor {
      min-height: 100vh;
      outline: none;
    }
    .milkdown {
      background: transparent;
    }
  </style>
</head>
<body>
  <div id="editor"></div>
  <script nonce="${nonce}">
    window.initialContent = ${JSON.stringify(escapedContent)};
    window.vscodeApi = acquireVsCodeApi();
  </script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  dispose(): void {
    this.panels.forEach((panel) => panel.dispose());
    this.syncControllers.forEach((controller) => controller.dispose());
    this.disposables.forEach((d) => d.dispose());
  }
}
