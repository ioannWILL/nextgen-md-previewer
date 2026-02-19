import * as vscode from 'vscode';
import * as path from 'path';
import { SyncController } from './syncController';

export class EditorManager implements vscode.Disposable {
  private panels: Map<string, vscode.WebviewPanel> = new Map();
  private syncControllers: Map<string, SyncController> = new Map();
  private disposables: vscode.Disposable[] = [];

  // Event emitter for panel close notifications
  private readonly _onPanelClosed = new vscode.EventEmitter<string>();
  public readonly onPanelClosed = this._onPanelClosed.event;

  constructor(private readonly context: vscode.ExtensionContext) {}

  // Check if a preview panel exists for the given URI
  hasPanel(uri: vscode.Uri): boolean {
    return this.panels.has(uri.toString());
  }

  private getConfig() {
    return vscode.workspace.getConfiguration('nextgenMdPreviewer');
  }

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

    // Determine view column based on setting
    const config = this.getConfig();
    const previewLocation = config.get<string>('previewLocation', 'sameTab');
    const viewColumn = previewLocation === 'sideBySide'
      ? vscode.ViewColumn.Beside
      : vscode.ViewColumn.Active;

    // Create webview panel
    const panel = vscode.window.createWebviewPanel(
      'nextgenMdPreviewer',
      `Preview: ${this.getFileName(uri)}`,
      viewColumn,
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

    // Handle panel disposal - await sync controller flush
    panel.onDidDispose(async () => {
      this.panels.delete(key);
      const controller = this.syncControllers.get(key);
      if (controller) {
        await controller.dispose();
        this.syncControllers.delete(key);
      }
      // Notify listeners that panel was closed
      this._onPanelClosed.fire(key);
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
    const config = this.getConfig();
    const toolbarVisible = config.get<boolean>('toolbar.visible', true);

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
      padding: 26px;
      max-width: 980px;
      margin-left: auto;
      margin-right: auto;
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

    /* Toolbar Styles */
    .toolbar {
      display: flex;
      align-items: center;
      background: var(--vscode-editorWidget-background, #252526);
      border-bottom: 1px solid var(--vscode-editorWidget-border, #454545);
      padding: 6px 26px;
      margin: -26px -26px 16px -26px;
      gap: 2px;
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .toolbar-group {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .toolbar-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--vscode-foreground, #cccccc);
      font-family: var(--vscode-font-family);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.1s ease;
    }

    .toolbar-button:hover {
      background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
    }

    .toolbar-button:active {
      background: var(--vscode-toolbar-activeBackground, rgba(99, 102, 103, 0.31));
    }

    .toolbar-button.active {
      background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
    }

    .toolbar-button.active:hover {
      background: var(--vscode-toolbar-activeBackground, rgba(99, 102, 103, 0.5));
    }

    .toolbar-button#toolbar-undo,
    .toolbar-button#toolbar-redo {
      font-size: 16px;
    }

    .toolbar-button#toolbar-bold {
      font-weight: 700;
    }

    .toolbar-button#toolbar-italic {
      font-style: italic;
    }

    .toolbar-button#toolbar-strikethrough {
      text-decoration: line-through;
    }

    .toolbar-button#toolbar-inlineCode {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 14px;
      font-weight: 400;
    }

    .toolbar-button#toolbar-codeBlock {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11px;
    }

    .toolbar-button#toolbar-link {
      font-size: 14px;
    }

    .toolbar-button#toolbar-blockquote {
      font-size: 16px;
      font-weight: 700;
    }

    .toolbar-separator {
      width: 1px;
      height: 20px;
      background: var(--vscode-editorWidget-border, #454545);
      margin: 0 4px;
    }

    /* Heading Dropdown */
    .heading-dropdown-container {
      position: relative;
    }

    .heading-button {
      width: auto;
      padding: 0 8px;
      gap: 4px;
    }

    .heading-button .dropdown-arrow {
      font-size: 10px;
      margin-left: 2px;
      opacity: 0.7;
    }

    .heading-dropdown {
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-top: 4px;
      background: var(--vscode-editorWidget-background, #252526);
      border: 1px solid var(--vscode-editorWidget-border, #454545);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      min-width: 140px;
      padding: 4px;
      z-index: 1001;
    }

    .heading-option {
      display: block;
      width: 100%;
      padding: 6px 10px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--vscode-foreground, #cccccc);
      font-family: var(--vscode-font-family);
      font-size: 13px;
      text-align: left;
      cursor: pointer;
      transition: background-color 0.1s ease;
    }

    .heading-option:hover {
      background: var(--vscode-list-hoverBackground, rgba(90, 93, 94, 0.31));
    }

    .heading-preview {
      display: block;
    }

    .heading-preview.h1 {
      font-size: 18px;
      font-weight: 600;
    }

    .heading-preview.h2 {
      font-size: 16px;
      font-weight: 600;
    }

    .heading-preview.h3 {
      font-size: 14px;
      font-weight: 600;
    }

    .heading-preview.h4 {
      font-size: 13px;
      font-weight: 600;
    }

    .heading-preview.h5 {
      font-size: 12px;
      font-weight: 600;
    }

    .heading-preview.h6 {
      font-size: 11px;
      font-weight: 600;
    }

    /* Link Dialog */
    .link-dialog {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }

    .link-dialog-content {
      background: var(--vscode-editorWidget-background, #252526);
      border: 1px solid var(--vscode-editorWidget-border, #454545);
      border-radius: 6px;
      padding: 16px;
      min-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .link-dialog-content label {
      display: block;
      margin-bottom: 8px;
      color: var(--vscode-foreground, #cccccc);
    }

    .link-dialog-content p {
      margin: 0 0 16px 0;
      color: var(--vscode-foreground, #cccccc);
    }

    .link-dialog-content input {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--vscode-input-border, #454545);
      background: var(--vscode-input-background, #3c3c3c);
      color: var(--vscode-input-foreground, #cccccc);
      border-radius: 4px;
      font-size: 13px;
      box-sizing: border-box;
    }

    .link-dialog-content input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder, #007acc);
    }

    .link-dialog-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }

    .link-dialog-buttons button {
      padding: 6px 14px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }

    .link-dialog-cancel {
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      color: var(--vscode-button-secondaryForeground, #cccccc);
    }

    .link-dialog-cancel:hover {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }

    .link-dialog-ok {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
    }

    .link-dialog-ok:hover {
      background: var(--vscode-button-hoverBackground, #1177bb);
    }
  </style>
</head>
<body>
  <div id="editor"></div>
  <script nonce="${nonce}">
    window.initialContent = ${JSON.stringify(initialContent)};
    window.toolbarVisible = ${JSON.stringify(toolbarVisible)};
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

  async dispose(): Promise<void> {
    // Flush all pending changes before disposing
    const flushPromises = Array.from(this.syncControllers.values()).map(
      (controller) => controller.dispose()
    );
    await Promise.all(flushPromises);

    this.panels.forEach((panel) => panel.dispose());
    this.syncControllers.clear();
    this.disposables.forEach((d) => d.dispose());
    this._onPanelClosed.dispose();
  }
}
