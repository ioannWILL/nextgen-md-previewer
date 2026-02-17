/**
 * Messages sent from the webview to the extension
 */
export interface WebviewToExtensionMessage {
  type: 'contentChanged' | 'ready';
  content?: string;
}

/**
 * Messages sent from the extension to the webview
 */
export interface ExtensionToWebviewMessage {
  type: 'contentUpdate' | 'configUpdate';
  content?: string;
  config?: EditorConfig;
}

/**
 * Editor configuration options
 */
export interface EditorConfig {
  autoSaveDelay: number;
  toolbar: {
    visible: boolean;
    position: 'top' | 'floating';
  };
  features: {
    math: boolean;
    mermaid: boolean;
  };
  images: {
    folder: string;
  };
}
