import * as vscode from 'vscode';
import * as path from 'path';
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
      vscode.ViewColumn.Active,
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
    const syncController = new SyncController(document, panel);
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
    return path.basename(uri.fsPath);
  }

  private getDocumentDirectory(uri: vscode.Uri): string {
    return path.dirname(uri.fsPath);
  }

  private static readonly NONCE_LENGTH = 32;

  private getWebviewContent(webview: vscode.Webview, initialContent: string): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'index.js')
    );

    const nonce = this.getNonce();

    // JSON.stringify handles all necessary escaping for embedding in script
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
      line-height: 1.6;
    }
    #editor {
      min-height: 100vh;
      outline: none;
    }
    .milkdown {
      background: transparent;
    }
    /* Code blocks */
    pre {
      background: var(--vscode-textBlockQuote-background, rgba(127, 127, 127, 0.1));
      border: 1px solid var(--vscode-panel-border, rgba(127, 127, 127, 0.2));
      border-radius: 4px;
      padding: 12px 16px;
      margin: 16px 0;
      overflow-x: auto;
    }
    pre code {
      font-family: var(--vscode-editor-font-family, 'Consolas', 'Courier New', monospace);
      font-size: var(--vscode-editor-font-size, 13px);
      background: transparent;
      padding: 0;
    }
    /* Inline code */
    code {
      font-family: var(--vscode-editor-font-family, 'Consolas', 'Courier New', monospace);
      background: var(--vscode-textBlockQuote-background, rgba(127, 127, 127, 0.1));
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.9em;
    }
    /* Tables */
    table {
      border-collapse: collapse;
      margin: 16px 0;
      width: 100%;
    }
    th, td {
      border: 1px solid var(--vscode-panel-border, rgba(127, 127, 127, 0.3));
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: var(--vscode-textBlockQuote-background, rgba(127, 127, 127, 0.1));
      font-weight: 600;
    }
    /* Blockquotes */
    blockquote {
      border-left: 4px solid var(--vscode-textBlockQuote-border, #007acc);
      margin: 16px 0;
      padding: 8px 16px;
      background: var(--vscode-textBlockQuote-background, rgba(127, 127, 127, 0.05));
    }
    /* Task lists */
    li[data-checked] {
      list-style: none;
      margin-left: -1.5em;
    }
    li[data-checked]::before {
      content: '';
      display: inline-block;
      width: 16px;
      height: 16px;
      margin-right: 8px;
      border: 1px solid var(--vscode-checkbox-border, #6b6b6b);
      border-radius: 3px;
      vertical-align: middle;
    }
    li[data-checked="true"]::before {
      background: var(--vscode-checkbox-background, #007acc);
      border-color: var(--vscode-checkbox-background, #007acc);
    }
    /* Horizontal rule */
    hr {
      border: none;
      border-top: 1px solid var(--vscode-panel-border, rgba(127, 127, 127, 0.3));
      margin: 24px 0;
    }
    /* Links */
    a {
      color: var(--vscode-textLink-foreground, #3794ff);
    }
    a:hover {
      color: var(--vscode-textLink-activeForeground, #3794ff);
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div id="editor"></div>
  <script nonce="${nonce}">
    window.initialContent = ${JSON.stringify(initialContent)};
    window.vscodeApi = acquireVsCodeApi();
  </script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < EditorManager.NONCE_LENGTH; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  dispose(): void {
    this.panels.forEach((panel) => panel.dispose());
    this.syncControllers.forEach((controller) => controller.dispose());
    this.disposables.forEach((d) => d.dispose());
  }
}
